import { NextRequest, NextResponse } from 'next/server';

// 延迟初始化Supabase
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

// 微信第三方平台配置
const COMPONENT_APPID = process.env.WECHAT_COMPONENT_APPID || '';
const COMPONENT_APP_SECRET = process.env.WECHAT_COMPONENT_APP_SECRET || '';

/**
 * 获取Component Access Token
 */
async function getComponentAccessToken(): Promise<string | null> {
  if (!COMPONENT_APPID || !COMPONENT_APP_SECRET) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/component/api_component_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_appid: COMPONENT_APPID,
          component_appsecret: COMPONENT_APP_SECRET,
        }),
      }
    );
    const data = await response.json();
    return data.component_access_token || null;
  } catch (error) {
    console.error('获取Component Access Token失败:', error);
    return null;
  }
}

/**
 * 使用授权码获取授权信息
 */
async function queryAuth(authCode: string, componentAccessToken: string) {
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=${componentAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: COMPONENT_APPID,
        authorization_code: authCode,
      }),
    }
  );
  return response.json();
}

/**
 * 获取公众号基本信息
 */
async function getAuthorizerInfo(authorizerAppid: string, componentAccessToken: string) {
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?component_access_token=${componentAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: COMPONENT_APPID,
        authorizer_appid: authorizerAppid,
      }),
    }
  );
  return response.json();
}

/**
 * GET /api/wechat-auth/callback
 * 处理微信授权回调
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authCode = searchParams.get('auth_code');
    const expiresIn = searchParams.get('expires_in');
    const authAppId = searchParams.get('auth_appid');

    // 如果是演示模式，直接返回成功页面
    if (!COMPONENT_APPID || !COMPONENT_APP_SECRET) {
      // 构建演示用HTML页面
      const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>授权演示</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #333; margin-bottom: 15px; font-size: 24px; }
    p { color: #666; margin-bottom: 10px; line-height: 1.6; }
    .info {
      background: #f5f5f5;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
      text-align: left;
    }
    .info-item { margin: 8px 0; color: #333; font-size: 14px; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 30px;
      border-radius: 25px;
      text-decoration: none;
      margin-top: 20px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🎉</div>
    <h1>演示模式授权成功</h1>
    <p>微信第三方平台未配置，已进入演示模式</p>
    <div class="info">
      <div class="info-item"><strong>授权码：</strong>${authCode || 'demo_code'}</div>
      <div class="info-item"><strong>有效期：</strong>${expiresIn || 1800}秒</div>
      <div class="info-item"><strong>授权AppID：</strong>${authAppId || 'demo_appid'}</div>
    </div>
    <p style="font-size: 12px; color: #999;">此为演示数据，实际使用需配置微信第三方平台</p>
    <a href="/account" class="btn">前往公众号管理</a>
  </div>
</body>
</html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 真实授权回调处理
    if (!authCode) {
      return NextResponse.redirect(new URL('/account?error=no_auth_code', request.url));
    }

    // 获取Component Access Token
    const componentAccessToken = await getComponentAccessToken();
    if (!componentAccessToken) {
      return NextResponse.redirect(new URL('/account?error=token_failed', request.url));
    }

    // 使用授权码换取授权信息
    const authInfo = await queryAuth(authCode, componentAccessToken);
    if (!authInfo.authorization_info) {
      console.error('授权信息获取失败:', authInfo);
      return NextResponse.redirect(new URL('/account?error=auth_failed', request.url));
    }

    const authInfoData = authInfo.authorization_info;

    // 获取公众号基本信息
    const authorizerInfo = await getAuthorizerInfo(
      authInfoData.authorizer_appid,
      componentAccessToken
    );

    const authorizerData = authorizerInfo.authorizer_info || {};

    // 计算token过期时间
    const tokenExpiresAt = new Date(Date.now() + (authInfoData.expires_in || 7200) * 1000);
    const refreshExpiresAt = new Date(Date.now() + (authInfoData.expires_in || 7200) * 1000);

    // 保存到数据库
    const supabaseClient = createSupabaseClient();
    if (!supabaseClient) {
      return NextResponse.redirect(new URL('/account?error=database_not_configured', request.url));
    }
    
    const { error } = await supabaseClient
      .from('wechat_accounts')
      .upsert({
        app_id: authInfoData.authorizer_appid,
        authorizer_appid: authInfoData.authorizer_appid,
        nickname: authorizerData.nickname,
        head_img: authorizerData.head_img,
        principal_type: authorizerData.principal_type,
        verify_type_info: authorizerData.verify_type_info,
        user_name: authorizerData.user_name,
        alias: authorizerData.alias,
        qrcode_url: authorizerData.qrcode_url,
        business_info: authorizerData.business_info ? JSON.stringify(authorizerData.business_info) : null,
        authorizer_access_token: authInfoData.authorizer_access_token,
        authorizer_refresh_token: authInfoData.authorizer_refresh_token,
        func_info: authInfoData.func_info ? JSON.stringify(authInfoData.func_info) : null,
        token_expires_at: tokenExpiresAt.toISOString(),
        refresh_expires_at: refreshExpiresAt.toISOString(),
        is_authorized: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'app_id',
      });

    if (error) {
      console.error('保存授权信息失败:', error);
      return NextResponse.redirect(new URL('/account?error=save_failed', request.url));
    }

    // 成功重定向
    return NextResponse.redirect(new URL('/account?success=true', request.url));

  } catch (error) {
    console.error('授权回调处理异常:', error);
    return NextResponse.redirect(new URL('/account?error=exception', request.url));
  }
}
