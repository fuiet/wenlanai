import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';

// 修改密码
export async function PUT(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ success: false, message: '数据库服务暂不可用' }, { status: 503 });
    }

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('session_token', sessionToken)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return NextResponse.json({ success: false, message: '会话已过期' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ success: false, message: '请填写完整' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: '密码至少6位' }, { status: 400 });
    }

    // 获取用户信息
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', session.user_id)
      .single();

    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    // 验证旧密码
    const passwordValid = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ success: false, message: '当前密码错误' }, { status: 400 });
    }

    // 更新密码
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user_id);

    if (error) {
      return NextResponse.json({ success: false, message: '修改失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('[ChangePassword Error]', error);
    return NextResponse.json({ success: false, message: '修改失败' }, { status: 500 });
  }
}
