import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请填写用户名和密码' },
        { status: 400 }
      );
    }

    // 查找用户
    const userResult = await query(
      `SELECT u.id, u.nickname, u.password_hash, mp.username, mp.vip_level, mp.vip_expire_at
       FROM users u
       JOIN member_profiles mp ON mp.user_id = u.id
       WHERE mp.username = $1 AND u.is_active = true`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // 验证密码
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 创建会话
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

    await query(
      `INSERT INTO sessions (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    // 构建用户信息
    const userData = {
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      vipLevel: user.vip_level || 1
    };

    // 创建响应
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: { user: userData }
    });

    // 设置 Cookie
    // 生产环境必须使用 secure: true（HTTPS）
    const isProduction = process.env.COZE_PROJECT_ENV === 'PROD';
    response.cookies.set('session_token', token, {
      path: '/',
      httpOnly: true,
      secure: isProduction, // 生产环境必须 true
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7天
    });

    return response;
  } catch (error: unknown) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) || '登录失败' },
      { status: 500 }
    );
  }
}
