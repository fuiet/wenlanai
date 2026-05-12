import { NextResponse } from 'next/server';

/**
 * 获取公众号授权链接
 * 
 * 方法：GET
 * URL：https://wenlanai.top/wechat/auth_url
 * 描述：用于生成并获取微信公众号的授权二维码链接，用户扫码后即可授权。
 */
export async function GET() {
  try {
    const response = await fetch('https://wenlanai.top/wechat/auth_url', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `请求失败: ${response.status} ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data,
      message: '获取授权链接成功',
    });

  } catch (error) {
    console.error('获取授权链接失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取授权链接失败' 
      },
      { status: 500 }
    );
  }
}
