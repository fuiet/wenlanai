import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user_id = request.nextUrl.searchParams.get('user_id') || 'anonymous';
  
  const COMPONENT_APPID = process.env.COMPONENT_APPID;
  const COMPONENT_APPSECRET = process.env.COMPONENT_APPSECRET;

  if (!COMPONENT_APPID || !COMPONENT_APPSECRET) {
    console.error('[微信授权] 缺少配置');
    return NextResponse.json({ error: '服务器配置错误' }, { status: 500 });
  }

  try {
    // 1. 获取 component_verify_ticket
    const ticketRes = await query(
      "SELECT config_value FROM wechat_config WHERE config_key = 'component_ticket'"
    );
    
    if (!ticketRes.rows || ticketRes.rows.length === 0) {
      return NextResponse.json({ error: '系统未就绪，微信ticket未收到，请稍后重试' }, { status: 500 });
    }

    let ticket = null;
    try {
      const ticketObj = JSON.parse(ticketRes.rows[0].config_value);
      ticket = ticketObj.ticket;
    } catch (e) {
      return NextResponse.json({ error: 'ticket解析失败' }, { status: 500 });
    }

    if (!ticket) {
      return NextResponse.json({ error: 'ticket无效' }, { status: 500 });
    }

    // 2. 获取 component_access_token
    const tokenResp = await fetch('https://api.weixin.qq.com/cgi-bin/component/api_component_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_appid: COMPONENT_APPID,
        component_appsecret: COMPONENT_APPSECRET,
        component_verify_ticket: ticket
      })
    });
    
    const tokenData = await tokenResp.json();
    
    if (tokenData.errcode || !tokenData.component_access_token) {
      console.error('[微信授权] 获取token失败:', tokenData);
      return NextResponse.json({ error: '获取token失败: ' + (tokenData.errmsg || '未知错误') }, { status: 500 });
    }
    
    const accessToken = tokenData.component_access_token;

    // 3. 获取预授权码
    const preAuthResp = await fetch(
      'https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=' + accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component_appid: COMPONENT_APPID })
      }
    );
    
    const preAuthData = await preAuthResp.json();
    
    if (preAuthData.errcode || !preAuthData.pre_auth_code) {
      console.error('[微信授权] 获取预授权码失败:', preAuthData);
      return NextResponse.json({ error: '获取预授权码失败: ' + (preAuthData.errmsg || '未知错误') }, { status: 500 });
    }
    
    const preAuthCode = preAuthData.pre_auth_code;

    // 4. 存储预授权码与用户关联
    try {
      await query(
        'INSERT INTO pending_auth (pre_auth_code, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)',
        [preAuthCode, user_id]
      );
    } catch (e) {
      console.error('[微信授权] 存储预授权码失败:', e);
    }

    // 5. 构造授权URL
    const redirectUri = encodeURIComponent('https://wenlanai.top/api/wechat/auth-callback');
    const authUrl = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${COMPONENT_APPID}&pre_auth_code=${preAuthCode}&redirect_uri=${redirectUri}`;

    console.log('[微信授权] 生成授权URL成功');
    return NextResponse.json({ auth_url: authUrl, pre_auth_code: preAuthCode });

  } catch (error) {
    console.error('[微信授权] 获取授权链接失败:', error);
    return NextResponse.json({ error: '获取授权链接失败: ' + (error instanceof Error ? error.message : '未知错误') }, { status: 500 });
  }
}
