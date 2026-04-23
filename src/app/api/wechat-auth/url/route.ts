import { NextRequest, NextResponse } from 'next/server';

// 初始化Supabase客户端（延迟初始化）
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

/**
 * 从数据库获取第三方平台配置
 */
async function getComponentConfig() {
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    return null;
  }
  
  try {
    const { data } = await supabaseClient
      .from('wechat_config')
      .select('config_value')
      .eq('config_key', 'component')
      .single();
    
    if (data?.config_value) {
      return JSON.parse(data.config_value);
    }
  } catch (error) {
    console.error('获取第三方平台配置失败:', error);
  }
  
  return null;
}

/**
 * 获取Component Access Token
 */
async function getComponentAccessToken(config: { appId: string; appSecret: string }): Promise<{ token: string | null; expiresIn?: number }> {
  try {
    const tokenUrl = 'https://api.weixin.qq.com/cgi-bin/component/api_component_token';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: config.appId,
        component_appsecret: config.appSecret,
      }),
    });
    const tokenData = await tokenResponse.json();

    if (tokenData.errcode) {
      console.error('获取component_access_token失败:', tokenData);
      return { token: null };
    }

    return { 
      token: tokenData.component_access_token,
      expiresIn: tokenData.expires_in 
    };
  } catch (error) {
    console.error('获取Component Access Token异常:', error);
    return { token: null };
  }
}

/**
 * 获取预授权码
 */
async function getPreAuthCode(config: { appId: string; appSecret: string }): Promise<string | null> {
  const { token } = await getComponentAccessToken(config);
  if (!token) {
    return null;
  }

  try {
    const preAuthUrl = `https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=${token}`;
    const preAuthResponse = await fetch(preAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: config.appId,
      }),
    });
    const preAuthData = await preAuthResponse.json();

    if (preAuthData.pre_auth_code) {
      return preAuthData.pre_auth_code;
    }

    console.error('获取pre_auth_code失败:', preAuthData);
    return null;
  } catch (error) {
    console.error('获取预授权码异常:', error);
    return null;
  }
}

/**
 * POST /api/wechat-auth/url
 * 生成授权URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { redirectUri } = body;

    // 从数据库获取配置
    const config = await getComponentConfig();
    
    // 如果没有配置第三方平台，返回演示模式
    if (!config?.appId || !config?.appSecret) {
      console.log('微信第三方平台未配置，返回演示模式');
      return NextResponse.json({
        success: true,
        demo: true,
        message: '演示模式：第三方平台未配置，请先配置第三方平台',
        data: {
          authUrl: null,
          preAuthCode: null,
          expiresIn: 0,
        },
      });
    }

    // 获取预授权码
    const preAuthCode = await getPreAuthCode(config);
    if (!preAuthCode) {
      return NextResponse.json(
        { success: false, message: '获取预授权码失败，请检查第三方平台配置是否正确' },
        { status: 500 }
      );
    }

    // 构建授权URL
    const callbackUrl = redirectUri || `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/wechat-auth/callback`;
    const authUrl = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${config.appId}&pre_auth_code=${preAuthCode}&redirect_uri=${encodeURIComponent(callbackUrl)}&auth_type=1`;

    return NextResponse.json({
      success: true,
      authUrl,
      data: {
        authUrl,
        preAuthCode,
        expiresIn: 1800,
      },
    });

  } catch (error) {
    console.error('生成授权URL异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wechat-auth/url
 * 获取授权状态
 */
export async function GET() {
  try {
    const supabaseClient = createSupabaseClient();
    const config = await getComponentConfig();
    
    // 查询已授权的公众号
    if (!supabaseClient) {
      return NextResponse.json({
        success: true,
        configured: !!(config?.appId && config?.appSecret),
        accounts: [],
        count: 0,
        demo: true,
      });
    }
    
    const { data: accounts, error } = await supabaseClient
      .from('wechat_accounts')
      .select('*')
      .eq('is_authorized', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('查询公众号失败:', error);
      return NextResponse.json(
        { success: false, message: '查询失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      configured: !!(config?.appId && config?.appSecret),
      accounts: accounts || [],
      count: accounts?.length || 0,
    });

  } catch (error) {
    console.error('获取授权状态异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}
