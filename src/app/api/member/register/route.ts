import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少6位' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingEmail = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUsername = await query(
      'SELECT id FROM member_profiles WHERE username = $1',
      [username]
    );

    if (existingUsername.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: '该用户名已被使用' },
        { status: 400 }
      );
    }

    // 加密密码
    const passwordHash = hashPassword(password);

    // 创建用户
    const userResult = await query(
      `INSERT INTO users (email, password_hash, nickname, is_active) 
       VALUES ($1, $2, $3, true) 
       RETURNING id`,
      [email, passwordHash, username]
    );

    const userId = userResult.rows[0].id;

    // 创建会员资料
    await query(
      `INSERT INTO member_profiles (user_id, username) VALUES ($1, $2)`,
      [userId, username]
    );

    // 生成会话token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

    await query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userId, sessionToken, expiresAt]
    );

    const response = NextResponse.json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: userId,
          email,
          username
        }
      }
    });

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '注册失败' },
      { status: 500 }
    );
  }
}
