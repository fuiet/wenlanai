/**
 * 微信OAuth回调处理
 * 接收code，换取用户信息，创建/绑定用户
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSession, COOKIE_NAME } from "@/lib/auth";

// 获取配置
function getWechatConfig() {
  return {
    appId: process.env.WX_COMPONENT_APPID || process.env.NEXT_PUBLIC_WX_APPID || '',
    appSecret: process.env.WX_COMPONENT_APPSECRET || process.env.NEXT_PUBLIC_WX_APPSECRET || '',
  };
}

// 获取access_token
async function getAccessToken(code: string, appId: string, appSecret: string) {
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.errcode) {
    throw new Error(data.errmsg || '获取access_token失败');
  }
  
  return data;
}

// 获取用户信息
async function getUserInfo(accessToken: string, openid: string) {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.errcode) {
    throw new Error(data.errmsg || '获取用户信息失败');
  }
  
  return data;
}

// GET: 处理微信回调
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // 获取存储的state和callback
  const storedState = request.cookies.get('wechat_auth_state')?.value;
  const callbackUrl = request.cookies.get('wechat_callback_url')?.value || '/';
  
  // 检查错误
  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=wechat_denied`, request.url));
  }
  
  // 验证state
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL(`/auth?error=invalid_state`, request.url));
  }
  
  const config = getWechatConfig();
  
  if (!config.appId || !config.appSecret) {
    return NextResponse.redirect(new URL(`/auth?error=not_configured`, request.url));
  }
  
  try {
    // 用code换取access_token
    const tokenData = await getAccessToken(code, config.appId, config.appSecret);
    
    // 获取用户信息
    const userInfo = await getUserInfo(tokenData.access_token, tokenData.openid);
    
    const supabase = getSupabaseAdmin();
    
    // 查找或创建用户
    let user;
    
    // 1. 先通过openid查找
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('wechat_openid', tokenData.openid)
      .single();
    
    if (existingUser) {
      // 用户已存在，更新信息
      user = existingUser;
      await supabase
        .from('users')
        .update({
          wechat_nickname: userInfo.nickname,
          wechat_avatar: userInfo.headimgurl,
          last_login_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } else {
      // 2. 如果有unionid，尝试通过unionid查找（同一开放平台下的用户）
      if (userInfo.unionid) {
        const { data: unionUser } = await supabase
          .from('users')
          .select('*')
          .eq('wechat_unionid', userInfo.unionid)
          .single();
        
        if (unionUser) {
          // 绑定openid
          await supabase
            .from('users')
            .update({
              wechat_openid: tokenData.openid,
              wechat_nickname: userInfo.nickname,
              wechat_avatar: userInfo.headimgurl,
              last_login_at: new Date().toISOString(),
            })
            .eq('id', unionUser.id);
          user = { ...unionUser, wechat_openid: tokenData.openid };
        }
      }
      
      // 3. 创建新用户
      if (!user) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            wechat_openid: tokenData.openid,
            wechat_unionid: userInfo.unionid || null,
            wechat_nickname: userInfo.nickname,
            wechat_avatar: userInfo.headimgurl,
            nickname: userInfo.nickname,
            avatar_url: userInfo.headimgurl,
            is_active: true,
          })
          .select()
          .single();
        
        if (createError) {
          console.error('[Wechat Login] 创建用户失败:', createError);
          return NextResponse.redirect(new URL(`/auth?error=create_failed`, request.url));
        }
        
        user = newUser;
      }
    }
    
    // 创建session
    const sessionToken = await createSession(user.id);
    
    // 创建响应
    const response = NextResponse.redirect(new URL(callbackUrl, request.url));
    
    // 设置session cookie
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });
    
    // 清除临时cookie
    response.cookies.delete('wechat_auth_state');
    response.cookies.delete('wechat_callback_url');
    
    return response;
    
  } catch (error: any) {
    console.error('[Wechat Login] 登录失败:', error);
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
