import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, query } from '@/lib/db';

/**
 * 微信第三方平台扫码授权API
 * 
 * 流程：
 * 1. 获取component_verify_ticket（从数据库，微信每10分钟推送一次）
 * 2. 使用ticket获取component_access_token
 * 3. 生成预授权码pre_auth_code
 * 4. 构建授权URL供用户扫码
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
};

/**
 * 从数据库获取第三方平台配置
 */
async function getComponentConfig() {
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) return null;
  
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
 * 从数据库获取component_verify_ticket
 */
async function getComponentVerifyTicket() {
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) return null;
  
  try {
    const { data } = await supabaseClient
      .from('wechat_config')
      .select('config_value')
      .eq('config_key', 'component_ticket')
      .single();
    
    if (data?.config_value) {
      const ticketData = JSON.parse(data.config_value);
      return ticketData.ticket;
    }
  } catch (error) {
    console.error('获取component_verify_ticket失败:', error);
  }
  
  return null;
}

/**
 * 获取Component Access Token
 * 需要component_verify_ticket
 */
async function getComponentAccessToken(
  config: { appId: string; appSecret: string },
  ticket: string
): Promise<string | null> {
  try {
    const response = await fetch(
      'https://api.weixin.qq.com/cgi-bin/component/api_component_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_appid: config.appId,
          component_appsecret: config.appSecret,
          component_verify_ticket: ticket,
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.component_access_token) {
      return data.component_access_token;
    }
    
    console.error('获取component_access_token失败:', data);
    return null;
  } catch (error) {
    console.error('获取Component Access Token异常:', error);
    return null;
  }
}

/**
 * 生成预授权码
 */
async function getPreAuthCode(
  config: { appId: string },
  componentAccessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=${componentAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_appid: config.appId,
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.pre_auth_code) {
      return data.pre_auth_code;
    }
    
    console.error('获取pre_auth_code失败:', data);
    return null;
  } catch (error) {
    console.error('生成预授权码异常:', error);
    return null;
  }
}

/**
 * POST /api/wechat-auth/scan
 * 生成扫码授权链接
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '请先登录后再绑定公众号' },
        { status: 401 }
      );
    }

    // 1. 获取第三方平台配置
    const config = await getComponentConfig();
    
    if (!config?.appId || !config?.appSecret) {
      return NextResponse.json({
        success: false,
        message: '请先配置微信第三方平台（AppID和AppSecret）',
        needConfig: true,
        helpUrl: '/wechat-setup-guide',
      });
    }
    
    // 2. 获取component_verify_ticket
    const ticket = await getComponentVerifyTicket();
    
    if (!ticket) {
      return NextResponse.json({
        success: false,
        message: '未收到component_verify_ticket，请确认授权事件接收URL配置正确，微信会每10分钟推送一次',
        needTicket: true,
        helpUrl: '/wechat-setup-guide',
      });
    }
    
    // 3. 获取Component Access Token
    const componentAccessToken = await getComponentAccessToken(config, ticket);
    
    if (!componentAccessToken) {
      return NextResponse.json({
        success: false,
        message: '获取Component Access Token失败，请检查AppID、AppSecret和ticket是否正确',
      });
    }
    
    // 4. 生成预授权码
    const preAuthCode = await getPreAuthCode(config, componentAccessToken);
    
    if (!preAuthCode) {
      return NextResponse.json({
        success: false,
        message: '生成预授权码失败',
      });
    }
    
    await query(
      'INSERT INTO pending_auth (pre_auth_code, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)',
      [preAuthCode, userId]
    );

    // 5. 构建授权URL
    const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const redirectUri = encodeURIComponent(`${baseUrl}/api/wechat-auth/callback?state=${encodeURIComponent(preAuthCode)}`);
    
    // 授权页面URL
    const authUrl = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${config.appId}&pre_auth_code=${preAuthCode}&redirect_uri=${redirectUri}&auth_type=1`;
    
    // 也可以使用扫码授权页（auth_type=3表示只展示公众号）
    const qrAuthUrl = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${config.appId}&pre_auth_code=${preAuthCode}&redirect_uri=${redirectUri}&auth_type=3`;
    
    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        qrAuthUrl,
        preAuthCode,
        expiresIn: 1800, // 预授权码有效期30分钟
      },
      message: '请打开链接或扫描二维码进行授权',
    });
    
  } catch (error) {
    console.error('生成授权链接异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wechat-auth/scan
 * 获取授权状态和配置信息
 */
export async function GET() {
  try {
    const config = await getComponentConfig();
    const ticket = await getComponentVerifyTicket();
    
    return NextResponse.json({
      success: true,
      configured: !!(config?.appId && config?.appSecret),
      hasTicket: !!ticket,
      config: config ? {
        appId: config.appId,
        hasSecret: !!config.appSecret,
      } : null,
    });
    
  } catch (error) {
    console.error('获取授权状态异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}
