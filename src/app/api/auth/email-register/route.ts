import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// 用户注册（用户名+密码，无需验证码）
export async function POST(request: NextRequest) {
  try {
    const { username, email, password, confirmPassword } = await request.json();

    // 参数验证
    if (!username || !email || !password || !confirmPassword) {
      return NextResponse.json({ success: false, message: '请填写完整信息' }, { status: 400 });
    }

    // 验证用户名
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json({ success: false, message: '用户名长度2-20位' }, { status: 400 });
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: '邮箱格式不正确' }, { status: 400 });
    }

    // 验证密码长度
    if (password.length < 6 || password.length > 20) {
      return NextResponse.json({ success: false, message: '密码长度6-20位' }, { status: 400 });
    }

    // 验证两次密码一致
    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, message: '两次密码不一致' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 检查用户名是否已存在
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', username)
      .single();

    if (existingUsername) {
      return NextResponse.json({ success: false, message: '该用户名已被使用' }, { status: 400 });
    }

    // 检查邮箱是否已注册
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return NextResponse.json({ success: false, message: '该邮箱已注册' }, { status: 400 });
    }

    // 加密密码
    const passwordHash = bcrypt.hashSync(password, 10);

    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        nickname: username,
        is_active: true,
        email_confirmed_at: new Date().toISOString()
      })
      .select('id, email, nickname, created_at')
      .single();

    if (createError) {
      console.error('创建用户失败:', createError);
      return NextResponse.json({ success: false, message: '注册失败，请稍后重试' }, { status: 500 });
    }

    // 创建session
    const sessionToken = await createSession(newUser.id);

    // 创建响应
    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        email: newUser.email,
        nickname: newUser.nickname
      }
    });

    // 设置session cookie
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
