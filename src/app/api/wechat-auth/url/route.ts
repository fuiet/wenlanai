import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: '缺少user_id' }, { status: 400 });
  const proxyUrl = new URL('/api/wechat/auth-url-proxy', request.url);
  proxyUrl.searchParams.set('user_id', userId);
  const res = await fetch(proxyUrl.toString());
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
