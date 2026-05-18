import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

const USERNAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,20}$/;

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';

    if (!normalizedUsername || !password) {
      return NextResponse.json(
        { success: false, error: '请填写用户名和密码' },
        { status: 400 }
      );
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return NextResponse.json(
        { success: false, error: '用户名需为2-20位中文、英文、数字、下划线或短横线' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: '密码至少8位' },
        { status: 400 }
      );
    }

    const existingUser = await query<{ id: string | number }>(
      'SELECT id FROM member_profiles WHERE username = ?',
      [normalizedUsername]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: '该用户名已被使用' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const email = `${normalizedUsername}_${Date.now()}@local.com`;

    await query(
      `INSERT INTO users (email, nickname, password_hash, is_active) VALUES (?, ?, ?, true)`,
      [email, normalizedUsername, passwordHash]
    );

    const idResult = await query<{ id: string | number }>('SELECT LAST_INSERT_ID() as id');
    const userId = idResult.rows[0].id;

    await query(
      `INSERT INTO member_profiles (user_id, username, vip_level, categories) VALUES (?, ?, 1, '{}')`,
      [userId, normalizedUsername]
    );

    return NextResponse.json({
      success: true,
      message: '注册成功，请登录'
    });
  } catch (error: unknown) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) || '注册失败' },
      { status: 500 }
    );
  }
}
