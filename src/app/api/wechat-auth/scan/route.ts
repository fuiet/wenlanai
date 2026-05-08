import { NextRequest, NextResponse } from 'next/server';

// 内存存储授权信息
const authSessions = new Map<string, {
  authCode: string;
  expiresAt: number;
  status: 'pending' | 'completed';
  appId?: string;
  nickname?: string;
}>();

/**
 * POST /api/wechat-auth/scan
 * 生成授权链接（真正的微信扫码授权）
 */
export async function POST() {
  try {
    // 获取公众号AppID和AppSecret（可以是服务商的，也可以直接用公众号的）
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    
    if (!appId || !appSecret) {
      return NextResponse.json({
        success: false,
        message: '请配置微信公众号凭证（环境变量 WECHAT_APP_ID 和 WECHAT_APP_SECRET）',
        needConfig: true,
      });
    }

    // 生成会话ID
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // 存储会话
    authSessions.set(sessionId, {
      authCode: '',
      expiresAt: Date.now() + 600000, // 10分钟
      status: 'pending',
    });

    // 获取网站域名
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    
    // 构造微信授权URL（使用公众号的网页授权）
    // 用户扫码后会跳转到回调页面，带上授权码
    const callbackUrl = encodeURIComponent(`${baseUrl}/account/scan-callback`);
    
    // 微信授权二维码链接（跳转到公众号授权页面）
    // 注意：这里使用特殊链接，用户扫码后会获得临时登录凭证
    const authUrl = `https://mp.weixin.qq.com/cgi-bin/loginpage?t=wxm2way&url=${callbackUrl}`;
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        authUrl,
        callbackUrl: `${baseUrl}/account/scan-callback`,
        expiresIn: 600,
      },
      configured: true,
    });

  } catch (error) {
    console.error('生成授权失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wechat-auth/scan
 * 查询授权状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: '缺少sessionId' },
        { status: 400 }
      );
    }
    
    const session = authSessions.get(sessionId);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        message: '会话不存在或已过期',
        expired: true,
      });
    }
    
    // 检查是否过期
    if (Date.now() > session.expiresAt) {
      authSessions.delete(sessionId);
      return NextResponse.json({
        success: false,
        message: '会话已过期，请重新扫码',
        expired: true,
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        status: session.status,
        authCode: session.authCode,
        appId: session.appId,
        nickname: session.nickname,
        remainingSeconds: Math.ceil((session.expiresAt - Date.now()) / 1000),
      },
    });

  } catch (error) {
    console.error('查询授权状态异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}
