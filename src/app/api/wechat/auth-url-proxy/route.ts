import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://wenlanai.top/wechat/auth_url');
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取授权链接失败:', error);
    return NextResponse.json(
      { error: '获取授权链接失败' },
      { status: 500 }
    );
  }
}
