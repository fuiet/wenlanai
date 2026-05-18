import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const result = await query<{
      id: number;
      username: string;
      password_hash: string;
    }>(
      `SELECT u.id, mp.username, u.password_hash 
       FROM member_profiles mp 
       JOIN users u ON u.id = mp.user_id 
       WHERE mp.username = ? AND u.is_active = true`,
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, NOW())`,
      [user.id, token, expiresAt]
    );

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username
        }
      }
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    return response;
  } catch (error: unknown) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) || '登录失败' },
      { status: 500 }
    );
  }
}
