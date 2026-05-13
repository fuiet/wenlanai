import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// 用户登出
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (sessionToken) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from('user_sessions').delete().eq('session_token', sessionToken);
      }
    }

    const response = NextResponse.json({ success: true, message: '已退出登录' });
    response.cookies.delete('session_token');

    return response;
  } catch (error) {
    console.error('[Logout Error]', error);
    return NextResponse.json({ success: false, message: '退出失败' }, { status: 500 });
  }
}
