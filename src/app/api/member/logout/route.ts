import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '退出成功'
  });

  // 清除 session_token cookie
  response.cookies.set('session_token', '', {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0 // 立即过期
  });

  return response;
}
