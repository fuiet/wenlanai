import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// 邮箱注册
export async function POST(request: NextRequest) {
  try {
    const { email, password, confirmPassword, code, request: req } = await request.json();

    // 参数验证
    if (!email || !password || !confirmPassword || !code) {
      return NextResponse.json({ success: false, message: '请填写完整信息' }, { status: 400 });
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

    // 验证验证码
    const { data: codeRecord, error: codeError } = await supabase
      .from('email_codes')
      .select('*')
      .eq('email', email)
      .eq('type', 'register')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeRecord) {
      return NextResponse.json({ success: false, message: '验证码无效或已过期' }, { status: 400 });
    }

    if (codeRecord.code !== code) {
      return NextResponse.json({ success: false, message: '验证码错误' }, { status: 400 });
    }

    // 标记验证码已使用
    await supabase.from('email_codes').update({ used: true }).eq('id', codeRecord.id);

    // 检查邮箱是否已注册
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
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
        nickname: email.split('@')[0], // 使用邮箱前缀作为昵称
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
    console.error('邮箱注册失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
