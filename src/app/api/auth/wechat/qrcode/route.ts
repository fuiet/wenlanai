/**
 * 微信OAuth扫码登录API
 * 用于生成授权链接、处理回调、获取用户信息
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// 获取配置
function getWechatConfig() {
  return {
    appId: process.env.WX_COMPONENT_APPID || process.env.NEXT_PUBLIC_WX_APPID || '',
    appSecret: process.env.WX_COMPONENT_APPSECRET || process.env.NEXT_PUBLIC_WX_APPSECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_WX_REDIRECT_URI || 'http://localhost:5000/api/auth/wechat/callback',
  };
}

// 生成state参数（防CSRF）
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// GET: 生成微信授权链接
export async function GET(request: NextRequest) {
  const config = getWechatConfig();
  const searchParams = request.nextUrl.searchParams;
  
  // 获取回调URL（可选）
  const callbackUrl = searchParams.get('callback') || '/';
  
  if (!config.appId) {
    return NextResponse.json({
      success: false,
      message: '微信配置未完成，请联系管理员',
      configured: false,
    }, { status: 400 });
  }
  
  // 生成state
  const state = generateState();
  
  // 存储state到cookie
  const response = NextResponse.json({
    success: true,
    authUrl: buildAuthUrl(config.appId, config.redirectUri, state),
    state,
    callbackUrl,
    message: '请使用微信扫描二维码',
  });
  
  // 设置state到cookie（有效期5分钟）
  response.cookies.set('wechat_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
  });
  
  response.cookies.set('wechat_callback_url', callbackUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
  });
  
  return response;
}

// 构建授权链接
function buildAuthUrl(appId: string, redirectUri: string, state: string): string {
  const baseUrl = 'https://open.weixin.qq.com/connect/qrconnect';
  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: encodeURIComponent(redirectUri),
    response_type: 'code',
    scope: 'snsapi_login',
    state: state,
  });
  return `${baseUrl}?${params.toString()}#wechat_redirect`;
}
