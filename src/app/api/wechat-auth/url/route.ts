import { NextRequest, NextResponse } from 'next/server';

// 初始化Supabase客户端（延迟初始化，避免环境变量缺失时报错）
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * 微信第三方平台配置
 * 
 * 注意：使用扫码授权需要配置以下环境变量：
 * - WECHAT_COMPONENT_APPID: 第三方平台AppID
 * - WECHAT_COMPONENT_APP_SECRET: 第三方平台AppSecret
 * - WECHAT_REDIRECT_URI: 授权回调地址
 * 
 * 如果未配置第三方平台，将返回模拟数据用于演示
 */

// 获取环境变量
const COMPONENT_APPID = process.env.WECHAT_COMPONENT_APPID || '';
const COMPONENT_APP_SECRET = process.env.WECHAT_COMPONENT_APP_SECRET || '';

/**
 * 获取预授权码
 */
async function getPreAuthCode(): Promise<string | null> {
  if (!COMPONENT_APPID || !COMPONENT_APP_SECRET) {
    return null;
  }

  try {
    // 获取component_access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/component/api_component_token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: COMPONENT_APPID,
        component_appsecret: COMPONENT_APP_SECRET,
      }),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenData.component_access_token) {
      console.error('获取component_access_token失败:', tokenData);
      return null;
    }

    const componentAccessToken = tokenData.component_access_token;

    // 获取预授权码
    const preAuthUrl = `https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=${componentAccessToken}`;
    const preAuthResponse = await fetch(preAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: COMPONENT_APPID,
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

    // 如果没有配置第三方平台，返回演示URL
    if (!COMPONENT_APPID || !COMPONENT_APP_SECRET) {
      console.log('微信第三方平台未配置，返回模拟授权信息');
      return NextResponse.json({
        success: true,
        message: '演示模式：微信第三方平台未配置',
        demo: true,
        data: {
          authUrl: `https://mp.weixin.qq.com/cgi-bin/loginpage?t=wxm2way&url=${encodeURIComponent(redirectUri || 'https://example.com/api/wechat-auth/callback')}`,
          preAuthCode: 'demo_pre_auth_code',
          expiresIn: 1800,
        },
      });
    }

    // 获取预授权码
    const preAuthCode = await getPreAuthCode();
    if (!preAuthCode) {
      return NextResponse.json(
        { success: false, message: '获取预授权码失败' },
        { status: 500 }
      );
    }

    // 构建授权URL
    const callbackUrl = redirectUri || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'}/api/wechat-auth/callback`;
    const authUrl = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${COMPONENT_APPID}&pre_auth_code=${preAuthCode}&redirect_uri=${encodeURIComponent(callbackUrl)}&auth_type=1`;

    return NextResponse.json({
      success: true,
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
    // 初始化Supabase
    const supabaseClient = createSupabaseClient();
    
    // 查询已授权的公众号
    if (!supabaseClient) {
      // Supabase未配置，返回空数据
      return NextResponse.json({
        success: true,
        configured: !!(COMPONENT_APPID && COMPONENT_APP_SECRET),
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
      configured: !!(COMPONENT_APPID && COMPONENT_APP_SECRET),
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
