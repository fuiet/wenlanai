import { NextResponse } from 'next/server';

/**
 * 获取 component_access_token
 * 
 * 方法：GET
 * URL：https://wenlanai.top/wechat/component_token
 * 描述：获取当前有效的微信第三方平台调用凭据。
 */
export async function GET() {
  try {
    const response = await fetch('https://wenlanai.top/wechat/component_token', {
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
      message: '获取 component_access_token 成功',
    });

  } catch (error) {
    console.error('获取 component_access_token 失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取 component_access_token 失败' 
      },
      { status: 500 }
    );
  }
}
