import { NextRequest, NextResponse } from 'next/server';

/**
 * 微信公众号授权回调处理
 * 处理用户授权后的回调，获取授权码并换取access_token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: '授权失败，未获取到授权码' },
      { status: 400 }
    );
  }

  try {
    // 从环境变量获取配置
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: '微信配置不完整，请联系管理员' },
        { status: 500 }
      );
    }

    // 使用授权码换取access_token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;

    const response = await fetch(tokenUrl);
    const tokenData = await response.json();

    if (tokenData.errcode) {
      return NextResponse.json(
        { error: `获取access_token失败: ${tokenData.errmsg}` },
        { status: 400 }
      );
    }

    const { access_token, openid } = tokenData;

    // 获取用户信息（公众号管理员信息）
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
    const userResponse = await fetch(userInfoUrl);
    const userData = await userResponse.json();

    if (userData.errcode) {
      return NextResponse.json(
        { error: `获取用户信息失败: ${userData.errmsg}` },
        { status: 400 }
      );
    }

    // 重定向到公众号管理页面，带上授权信息
    return NextResponse.redirect(
      `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/official-account?authorized=true&openid=${openid}&nickname=${encodeURIComponent(userData.nickname || '')}`
    );

  } catch (error) {
    console.error('微信授权回调处理失败:', error);
    return NextResponse.json(
      { error: '授权处理失败，请重试' },
      { status: 500 }
    );
  }
}
