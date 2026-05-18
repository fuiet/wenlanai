import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
async function getComponentAccessToken(config: { appId: string; appSecret: string }): Promise<string | null> {
  try {
    const response = await fetch(
      'https://api.weixin.qq.com/cgi-bin/component/api_component_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_appid: config.appId,
          component_appsecret: config.appSecret,
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
async function queryAuth(authCode: string, config: { appId: string }, componentAccessToken: string) {
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=${componentAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: config.appId,
        authorization_code: authCode,
      }),
    }
  );
  return response.json();
}

/**
 * 获取公众号基本信息
 */
async function getAuthorizerInfo(authorizerAppid: string, config: { appId: string }, componentAccessToken: string) {
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?component_access_token=${componentAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: config.appId,
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
    const state = searchParams.get('state');

    // 从数据库获取配置
    const config = await getComponentConfig();
    
    // 如果是演示模式，直接返回成功页面
    if (!config?.appId || !config?.appSecret) {
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
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
      text-align: left;
    }
    .warning-title { font-weight: bold; color: #856404; margin-bottom: 8px; }
    .warning-text { color: #856404; font-size: 14px; line-height: 1.6; }
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
    <div class="warning">
      <div class="warning-title">⚠️ 重要提示</div>
      <div class="warning-text">
        此为演示模式，数据不会被保存。<br>
        要实现真正的公众号绑定和推送功能，请先配置微信第三方平台。
      </div>
    </div>
    <a href="/official-account" class="btn">前往公众号管理</a>
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
      return NextResponse.redirect(new URL('/official-account?tab=auth&error=no_auth_code', request.url));
    }

    let userId: string | null = null;
    if (state) {
      const pending = await query<{ user_id: string | number }>('SELECT user_id FROM pending_auth WHERE pre_auth_code = ? LIMIT 1', [state]);
      if (pending.rows.length > 0) {
        userId = String(pending.rows[0].user_id);
      }
    }

    if (!userId) {
      return NextResponse.redirect(new URL('/official-account?tab=auth&error=user_not_found', request.url));
    }

    // 获取Component Access Token
    const componentAccessToken = await getComponentAccessToken(config);
    if (!componentAccessToken) {
      return NextResponse.redirect(new URL('/official-account?tab=auth&error=token_failed', request.url));
    }

    // 使用授权码换取授权信息
    const authInfo = await queryAuth(authCode, config, componentAccessToken);
    if (!authInfo.authorization_info) {
      console.error('授权信息获取失败:', authInfo);
      return NextResponse.redirect(new URL('/official-account?tab=auth&error=auth_failed', request.url));
    }

    const authInfoData = authInfo.authorization_info;

    // 获取公众号基本信息
    const authorizerInfo = await getAuthorizerInfo(
      authInfoData.authorizer_appid,
      config,
      componentAccessToken
    );

    const authorizerData = authorizerInfo.authorizer_info || {};

    // 计算token过期时间
    const tokenExpiresAt = new Date(Date.now() + (authInfoData.expires_in || 7200) * 1000);
    const refreshExpiresAt = new Date(Date.now() + (authInfoData.expires_in || 7200) * 1000);

    // 保存到数据库
    const supabaseClient = createSupabaseClient();
    if (!supabaseClient) {
      return NextResponse.redirect(new URL('/official-account?tab=auth&error=database_not_configured', request.url));
    }
    
    const { data: otherOwner } = await supabaseClient
      .from('wechat_accounts')
      .select('id, user_id')
      .eq('app_id', authInfoData.authorizer_appid)
      .neq('user_id', userId)
      .maybeSingle();

    if (otherOwner) {
      return NextResponse.redirect(new URL('/official-account?tab=auth&error=already_bound', request.url));
    }

    // 检查当前用户是否已绑定同一公众号
    const { data: existing } = await supabaseClient
      .from('wechat_accounts')
      .select('id')
      .eq('app_id', authInfoData.authorizer_appid)
      .eq('user_id', userId)
      .maybeSingle();

    const accountPayload = {
      user_id: userId,
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
    };

    if (existing) {
      await supabaseClient
        .from('wechat_accounts')
        .update(accountPayload)
        .eq('id', existing.id)
        .eq('user_id', userId);
    } else {
      await supabaseClient
        .from('wechat_accounts')
        .insert(accountPayload);
    }

    if (state) {
      await query<Record<string, unknown>>('DELETE FROM pending_auth WHERE pre_auth_code = ?', [state]);
    }

    // 成功重定向
    return NextResponse.redirect(new URL('/official-account?tab=list&success=auth_success', request.url));

  } catch (error) {
    console.error('授权回调处理异常:', error);
    return NextResponse.redirect(new URL('/official-account?tab=auth&error=exception', request.url));
  }
}
