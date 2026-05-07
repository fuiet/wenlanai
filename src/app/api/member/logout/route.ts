import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (sessionToken) {
      // 删除会话
      await query('DELETE FROM sessions WHERE token = $1', [sessionToken]);
    }

    const response = NextResponse.json({
      success: true,
      message: '已退出登录'
    });

    // 清除cookie
    response.cookies.delete('session_token');

    return response;
  } catch (error: any) {
    console.error('退出登录错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '退出登录失败' },
      { status: 500 }
    );
  }
}
