import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// 获取当前用户信息
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return NextResponse.json({ success: false, message: '会话已过期' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, phone, nickname, avatar_url, created_at')
      .eq('id', session.user_id)
      .single();

    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('[GetUser Error]', error);
    return NextResponse.json({ success: false, message: '获取用户信息失败' }, { status: 500 });
  }
}

// 更新用户信息
export async function PUT(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return NextResponse.json({ success: false, message: '会话已过期' }, { status: 401 });
    }

    const { nickname, avatar_url } = await request.json();

    const updates: Record<string, string> = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user_id);

    if (error) {
      return NextResponse.json({ success: false, message: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('[UpdateUser Error]', error);
    return NextResponse.json({ success: false, message: '更新失败' }, { status: 500 });
  }
}
