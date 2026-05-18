import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// 创建用户
export async function POST(request: NextRequest) {
  try {
    const { phone, password, confirmPassword, smsCode } = await request.json();

    // 参数验证
    if (!phone || !password || !confirmPassword || !smsCode) {
      return NextResponse.json({ success: false, message: '请填写完整信息' }, { status: 400 });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ success: false, message: '手机号格式不正确' }, { status: 400 });
    }

    // 验证密码长度
    if (password.length < 6 || password.length > 20) {
      return NextResponse.json({ success: false, message: '密码长度6-20位' }, { status: 400 });
    }

    // 验证两次密码一致
    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, message: '两次密码不一致' }, { status: 400 });
    }

    // 验证验证码
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ success: false, message: '数据库服务暂不可用' }, { status: 503 });
    }
    
    const { data: codeRecord, error: codeError } = await supabase
      .from('sms_codes')
      .select('*')
      .eq('phone', phone)
      .eq('type', 'register')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeRecord) {
      return NextResponse.json({ success: false, message: '验证码无效或已过期' }, { status: 400 });
    }

    if (codeRecord.code !== smsCode) {
      return NextResponse.json({ success: false, message: '验证码错误' }, { status: 400 });
    }

    // 标记验证码已使用
    await supabase.from('sms_codes').update({ used: true }).eq('id', codeRecord.id);

    // 检查手机号是否已注册
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: false, message: '该手机号已注册' }, { status: 400 });
    }

    // 加密密码
    const passwordHash = bcrypt.hashSync(password, 10);

    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        phone,
        password_hash: passwordHash,
        nickname: `用户${phone.slice(-4)}`,
        is_active: true
      })
      .select('id, phone, nickname, created_at')
      .single();

    if (createError) {
      console.error('[Register Error]', createError);
      return NextResponse.json({ success: false, message: '注册失败' }, { status: 500 });
    }

    // 生成会话Token
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

    // 存储会话
    await supabase.from('user_sessions').insert({
      user_id: newUser.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // 返回成功响应
    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        phone: newUser.phone,
        nickname: newUser.nickname
      }
    });

    // 设置Cookie
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('[Register Error]', error);
    return NextResponse.json({ success: false, message: '注册失败' }, { status: 500 });
  }
}
