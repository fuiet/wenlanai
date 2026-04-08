import { NextRequest, NextResponse } from 'next/server';

/**
 * 获取公众号access_token
 * 用于公众号API调用（如群发消息）
 */
export async function POST(request: NextRequest) {
  try {
    const { appId, appSecret } = await request.json();

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'appId和appSecret不能为空' },
        { status: 400 }
      );
    }

    // 获取公众号access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

    const response = await fetch(tokenUrl);
    const data = await response.json();

    if (data.errcode) {
      return NextResponse.json(
        { error: `获取access_token失败: ${data.errmsg}` },
        { status: 400 }
      );
    }

    // 返回access_token（注意：生产环境应该缓存这个token，有效期2小时）
    return NextResponse.json({
      success: true,
      data: {
        accessToken: data.access_token,
        expiresIn: data.expires_in
      }
    });

  } catch (error) {
    console.error('获取公众号access_token失败:', error);
    return NextResponse.json(
      { error: '获取access_token失败，请重试' },
      { status: 500 }
    );
  }
}
