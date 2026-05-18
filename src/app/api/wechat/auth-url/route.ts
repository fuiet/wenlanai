import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const COMPONENT_APPID = process.env.WECHAT_COMPONENT_APPID || '';
const COMPONENT_APPSECRET = process.env.WECHAT_COMPONENT_APPSECRET || '';

async function getComponentAccessToken() {
  const result = await query<{ config_value: string }>("SELECT config_value FROM wechat_config WHERE config_key = 'component_ticket'");
  if (result.rows.length === 0) throw new Error('未收到ticket');
  const ticketData = JSON.parse(result.rows[0].config_value);
  const response = await fetch('https://api.weixin.qq.com/cgi-bin/component/api_component_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ component_appid: COMPONENT_APPID, component_appsecret: COMPONENT_APPSECRET, component_verify_ticket: ticketData.ticket })
  });
  const data = await response.json();
  if (data.errcode) throw new Error(data.errmsg);
  return data.component_access_token;
}

async function getPreAuthCode(accessToken) {
  const response = await fetch('https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=' + accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ component_appid: COMPONENT_APPID })
  });
  const data = await response.json();
  if (data.errcode) throw new Error(data.errmsg);
  return data.pre_auth_code;
}

export async function GET() {
  try {
    if (!COMPONENT_APPID) return NextResponse.json({ success: false, error: '未配置' });
    const accessToken = await getComponentAccessToken();
    const preAuthCode = await getPreAuthCode(accessToken);
    const redirectUri = encodeURIComponent('https://wenlanai.top/api/wechat/auth-callback');
    const authUrl = 'https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=' + COMPONENT_APPID + '&pre_auth_code=' + preAuthCode + '&redirect_uri=' + redirectUri;
    return NextResponse.json({ success: true, data: { authUrl, preAuthCode } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}