import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// 获取当前登录状态
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ 
        success: false, 
        message: '未登录',
        loggedIn: false
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: '会话不存在',
        loggedIn: false
      });
    }

    // 检查是否过期
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ 
        success: false, 
        message: '会话已过期',
        loggedIn: false
      });
    }

    // 获取用户信息
    const { data: user } = await supabase
      .from('users')
      .select('id, phone, nickname, avatar_url, email')
      .eq('id', session.user_id)
      .single();

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: '用户不存在',
        loggedIn: false
      });
    }

    return NextResponse.json({
      success: true,
      loggedIn: true,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        email: user.email
      }
    });
  } catch (error) {
    console.error('[CheckLogin Error]', error);
    return NextResponse.json({ 
      success: false, 
      message: '检查登录状态失败',
      loggedIn: false
    }, { status: 500 });
  }
}

// 用户登录（支持邮箱登录）
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: '请填写邮箱和密码' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 查找用户（使用邮箱）
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: '该邮箱未注册' 
      }, { status: 401 });
    }

    // 验证密码
    const passwordValid = bcrypt.compareSync(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ 
        success: false, 
        message: '密码错误' 
      }, { status: 401 });
    }

    // 创建session
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

    await supabase.from('user_sessions').insert({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    // 更新最后登录时间
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url
      }
    });

    // 设置cookie
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('[Login Error]', error);
    return NextResponse.json({ 
      success: false, 
      message: '登录失败' 
    }, { status: 500 });
  }
}
