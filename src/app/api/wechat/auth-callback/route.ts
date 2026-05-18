import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const COMPONENT_APPID = process.env.COMPONENT_APPID || '';
const COMPONENT_APPSECRET = process.env.COMPONENT_APPSECRET || '';

async function getComponentAccessToken(): Promise<string> {
  const ticketResult = await query(
    "SELECT config_value FROM wechat_config WHERE config_key = 'component_ticket'"
  );
  
  if (!ticketResult.rows || ticketResult.rows.length === 0) {
    throw new Error('未找到component_verify_ticket');
  }

  const ticketData = JSON.parse(ticketResult.rows[0].config_value);
  const ticket = ticketData.ticket;

  const response = await fetch(
    'https://api.weixin.qq.com/cgi-bin/component/api_component_token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: COMPONENT_APPID,
        component_appsecret: COMPONENT_APPSECRET,
        component_verify_ticket: ticket
      })
    }
  );

  const data = await response.json();
  
  if (data.errcode) {
    throw new Error('获取token失败: ' + data.errmsg);
  }

  return data.component_access_token;
}

async function getAuthorizationInfo(accessToken: string, authCode: string) {
  const response = await fetch(
    'https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=' + accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: COMPONENT_APPID,
        authorization_code: authCode
      })
    }
  );

  const data = await response.json();
  
  if (data.errcode) {
    throw new Error('获取授权信息失败: ' + data.errmsg);
  }

  return data;
}

async function getAuthorizerInfo(accessToken: string, authorizerAppid: string) {
  const response = await fetch(
    'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?component_access_token=' + accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: COMPONENT_APPID,
        authorizer_appid: authorizerAppid
      })
    }
  );

  const data = await response.json();
  
  if (data.errcode) {
    console.error('获取公众号信息失败:', data);
    return null;
  }

  return data;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authCode = searchParams.get('auth_code');
  const state = searchParams.get('state');

  console.log('[授权回调] auth_code:', authCode);

  if (!authCode) {
    return new NextResponse(
      '<html><body><script>window.opener && window.opener.postMessage({type:"wechat_auth_failed"}, "*");</script><h1>授权失败</h1></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    let userId: string | null = null;
    if (state) {
      const pending = await query<{ user_id: string | number }>('SELECT user_id FROM pending_auth WHERE pre_auth_code = ? LIMIT 1', [state]);
      if (pending.rows.length > 0) {
        userId = String(pending.rows[0].user_id);
      }
    }

    if (!userId) {
      throw new Error('无法确认当前登录用户，请重新发起授权');
    }

    const accessToken = await getComponentAccessToken();
    const authInfo = await getAuthorizationInfo(accessToken, authCode);
    const authorizerAppid = authInfo.authorization_info.authorizer_appid;
    const authorizerAccessToken = authInfo.authorization_info.authorizer_access_token;
    const authorizerRefreshToken = authInfo.authorization_info.authorizer_refresh_token;

    console.log('[授权回调] 授权成功:', authorizerAppid);

    const authorizerInfo = await getAuthorizerInfo(accessToken, authorizerAppid);
    const nickname = authorizerInfo?.authorizer_info?.nick_name || '';
    const headImg = authorizerInfo?.authorizer_info?.head_img || '';
    const serviceTypeInfo = authorizerInfo?.authorizer_info?.service_type_info?.id || 0;

    const existing = await query<{ user_id: string | number }>('SELECT user_id FROM wechat_accounts WHERE app_id = ? LIMIT 1', [authorizerAppid]);
    if (existing.rows.length > 0 && String(existing.rows[0].user_id) !== String(userId)) {
      throw new Error('该公众号已绑定到其他账号，请先在原账号解绑');
    }

    // MySQL 语法保存，写入 user_id 确保公众号只属于当前登录用户
    await query(
      'INSERT INTO wechat_accounts (user_id, app_id, nick_name, head_img, service_type_info, authorizer_access_token, authorizer_refresh_token, is_authorized, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW()) ON DUPLICATE KEY UPDATE nick_name=VALUES(nick_name), head_img=VALUES(head_img), authorizer_access_token=VALUES(authorizer_access_token), authorizer_refresh_token=VALUES(authorizer_refresh_token), is_authorized=true, updated_at=NOW()',
      [userId, authorizerAppid, nickname, headImg, serviceTypeInfo, authorizerAccessToken, authorizerRefreshToken]
    );

    if (state) {
      await query('DELETE FROM pending_auth WHERE pre_auth_code = ?', [state]);
    }

    console.log('[授权回调] 已保存公众号信息:', nickname);

    return new NextResponse(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>授权成功</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}.container{text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,.1)}.icon{font-size:64px;margin-bottom:20px}h1{color:#07c160;margin-bottom:10px}p{color:#666;margin-bottom:20px}.info{background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px}</style></head><body><div class="container"><div class="icon">✅</div><h1>授权成功</h1><p>公众号已成功绑定</p><div class="info"><p><strong>公众号：</strong>' + nickname + '</p><p><strong>AppID：</strong>' + authorizerAppid + '</p></div></div><script>if(window.opener){window.opener.postMessage({type:"wechat_auth_success",appid:"' + authorizerAppid + '",nickname:"' + nickname + '"},"*");}setTimeout(function(){window.close()},2000);</script></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error) {
    console.error('[授权回调] 处理失败:', error);
    
    return new NextResponse(
      '<html><body><script>window.opener && window.opener.postMessage({type:"wechat_auth_failed",error:"' + (error instanceof Error ? error.message : '未知错误') + '"},"*");</script><h1>授权失败</h1><p>' + (error instanceof Error ? error.message : '未知错误') + '</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
