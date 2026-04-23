import { NextRequest, NextResponse } from 'next/server';

/**
 * 第三方平台配置 API
 * 
 * 用于配置微信第三方平台的AppID和AppSecret
 * 用户需要先在微信公众平台创建第三方平台，然后填入配置
 */

// 延迟初始化Supabase
const createSupabaseClient = () => {
  const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey);
}

// 第三方平台配置表
const CONFIG_TABLE = 'wechat_config';

/**
 * POST /api/wechat-config
 * 保存第三方平台配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, appSecret, redirectUri } = body;

    // 参数验证
    if (!appId || !appSecret) {
      return NextResponse.json(
        { success: false, message: 'AppID和AppSecret不能为空' },
        { status: 400 }
      );
    }

    // 验证AppID格式（应该是wx开头）
    if (!appId.startsWith('wx')) {
      return NextResponse.json(
        { success: false, message: 'AppID格式不正确，应以wx开头' },
        { status: 400 }
      );
    }

    const supabaseClient = createSupabaseClient();
    
    // 先验证凭证是否有效
    try {
      const tokenUrl = 'https://api.weixin.qq.com/cgi-bin/component/api_component_token';
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_appid: appId,
          component_appsecret: appSecret,
        }),
      });
      const tokenData = await tokenResponse.json();

      if (tokenData.errcode) {
        return NextResponse.json({
          success: false,
          message: `验证失败：${tokenData.errmsg || '请检查AppID和AppSecret是否正确'}`,
          error: tokenData,
        });
      }

      // 凭证有效，保存到数据库
      if (supabaseClient) {
        // 检查是否已有配置
        const { data: existingConfig } = await supabaseClient
          .from(CONFIG_TABLE)
          .select('*')
          .eq('config_key', 'component')
          .single();

        if (existingConfig) {
          // 更新配置
          await supabaseClient
            .from(CONFIG_TABLE)
            .update({
              config_value: JSON.stringify({ appId, appSecret, redirectUri }),
              updated_at: new Date().toISOString(),
            })
            .eq('config_key', 'component');
        } else {
          // 插入新配置
          await supabaseClient
            .from(CONFIG_TABLE)
            .insert({
              config_key: 'component',
              config_value: JSON.stringify({ appId, appSecret, redirectUri }),
            });
        }
      }

      return NextResponse.json({
        success: true,
        message: '第三方平台配置成功！',
        data: {
          appId,
          redirectUri: redirectUri || `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/wechat-auth/callback`,
        },
      });

    } catch (error) {
      console.error('验证第三方平台配置失败:', error);
      return NextResponse.json({
        success: false,
        message: '验证第三方平台配置失败，请检查网络连接',
      });
    }

  } catch (error) {
    console.error('保存配置异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wechat-config
 * 获取第三方平台配置状态
 */
export async function GET() {
  try {
    const supabaseClient = createSupabaseClient();
    
    let configured = false;
    let config = null;

    if (supabaseClient) {
      const { data } = await supabaseClient
        .from(CONFIG_TABLE)
        .select('config_value')
        .eq('config_key', 'component')
        .single();

      if (data) {
        try {
          config = JSON.parse(data.config_value);
          configured = !!(config.appId && config.appSecret);
        } catch {
          configured = false;
        }
      }
    }

    return NextResponse.json({
      success: true,
      configured,
      config: configured ? {
        appId: config.appId,
        redirectUri: config.redirectUri,
      } : null,
      message: configured ? '第三方平台已配置' : '第三方平台未配置',
    });

  } catch (error) {
    console.error('获取配置异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wechat-config
 * 删除第三方平台配置
 */
export async function DELETE() {
  try {
    const supabaseClient = createSupabaseClient();
    
    if (supabaseClient) {
      await supabaseClient
        .from(CONFIG_TABLE)
        .delete()
        .eq('config_key', 'component');
    }

    return NextResponse.json({
      success: true,
      message: '配置已删除',
    });

  } catch (error) {
    console.error('删除配置异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}
