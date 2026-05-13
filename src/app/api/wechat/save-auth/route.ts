import { NextRequest, NextResponse } from 'next/server';

/**
 * 保存微信授权信息代理API
 * 
 * 方法：POST
 * 宝塔后端URL：https://wenlanai.top/wechat/save_auth
 * 描述：保存微信授权信息到后端
 */
export async function POST(request: NextRequest) {
  const BACKEND_URL = process.env.WECHAT_BACKEND_URL || 'https://wenlanai.top';
  
  try {
    const body = await request.json();
    const { auth_code } = body;

    if (!auth_code) {
      return NextResponse.json({
        success: false,
        error: '缺少 auth_code 参数'
      }, { status: 400 });
    }

    console.log('[save-auth] 保存授权信息, auth_code:', auth_code.substring(0, 20) + '...');

    // 调用宝塔后端保存授权信息
    const response = await fetch(`${BACKEND_URL}/wechat/save_auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auth_code }),
    });

    const result = await response.json();
    console.log('[save-auth] 后端响应:', result);

    if (response.ok && result.success) {
      return NextResponse.json({
        success: true,
        message: '授权信息保存成功',
        data: result.data || {}
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || '保存授权信息失败',
        message: result.message || '保存授权信息失败'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[save-auth] 保存授权信息失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }, { status: 500 });
  }
}
