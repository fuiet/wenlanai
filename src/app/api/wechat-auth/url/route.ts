import { NextRequest, NextResponse } from 'next/server';

// 宝塔后端地址
const BACKEND_URL = process.env.WECHAT_BACKEND_URL || 'https://wenlanai.top';

/**
 * 获取公众号授权二维码链接
 * 通过调用宝塔后端接口实现
 */
export async function GET(request: NextRequest) {
  try {
    // 获取重定向URL（可选）
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirect_uri');

    // 构建请求URL
    let requestUrl = `${BACKEND_URL}/wechat/auth_url`;
    if (redirectUri) {
      requestUrl += `?redirect_uri=${encodeURIComponent(redirectUri)}`;
    }

    // 调用宝塔后端获取授权URL
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok && result.auth_url) {
      return NextResponse.json({
        success: true,
        data: {
          authUrl: result.auth_url,
          expiresIn: result.expires_in || 1800,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message || '获取授权URL失败',
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('获取授权URL失败:', error);
    return NextResponse.json({
      success: false,
      message: '无法连接到后端服务',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * 获取已授权公众号列表
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'list') {
      // 调用后端获取已授权账号列表
      const response = await fetch(`${BACKEND_URL}/wechat/accounts`, {
        method: 'GET',
      });

      const result = await response.json();

      return NextResponse.json({
        success: true,
        accounts: result.accounts || [],
        count: result.count || 0,
      });
    }

    return NextResponse.json({
      success: false,
      message: '未知操作',
    }, { status: 400 });
  } catch (error) {
    console.error('操作失败:', error);
    return NextResponse.json({
      success: false,
      message: '操作失败',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
