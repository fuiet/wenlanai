import { NextRequest, NextResponse } from 'next/server';

// 宝塔后端地址
const BACKEND_URL = process.env.WECHAT_BACKEND_URL || 'https://wenlanai.top';

/**
 * 推送文章到微信公众号草稿箱
 * 通过调用宝塔后端接口实现
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, imageUrls, authorId } = body;

    if (!title || !content) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数：title 或 content'
      }, { status: 400 });
    }

    // 调用宝塔后端推送接口
    const response = await fetch(`${BACKEND_URL}/api/push_draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        image_urls: imageUrls || [],
        author_id: authorId,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return NextResponse.json({
        success: true,
        message: '推送成功，文章已发送到公众号草稿箱',
        data: result.data,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message || '推送失败',
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('推送文章失败:', error);
    return NextResponse.json({
      success: false,
      message: '推送失败，请检查网络连接或后端服务状态',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * 获取推送API状态
 */
export async function GET() {
  try {
    // 检查宝塔后端服务状态
    const response = await fetch(`${BACKEND_URL}/wechat/component_token`, {
      method: 'GET',
    });

    const isHealthy = response.ok;

    return NextResponse.json({
      success: true,
      configured: true,
      backend: BACKEND_URL,
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy 
        ? '后端服务正常运行' 
        : '后端服务连接失败，请检查服务状态',
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      configured: true,
      backend: BACKEND_URL,
      status: 'error',
      message: '无法连接到后端服务',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
