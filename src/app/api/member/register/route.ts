import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
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

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { success: false, error: '用户名长度需要在2-20个字符之间' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少6位' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在（在 member_profiles 中）
    const existingUser = await query(
      'SELECT id FROM member_profiles WHERE username = ?',
      [username]
    );

    if (existingUser.rows && existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: '该用户名已被使用' },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);
    const email = `${username}_${Date.now()}@local.com`;

    // 插入 users 表
    await query(
      `INSERT INTO users (email, nickname, password_hash, is_active) VALUES (?, ?, ?, true)`,
      [email, username, passwordHash]
    );

    // 获取最后插入的 ID
    const idResult = await query('SELECT LAST_INSERT_ID() as id');
    const userId = idResult.rows[0].id;

    // 插入 member_profiles 表
    await query(
      `INSERT INTO member_profiles (user_id, username, vip_level, categories) VALUES (?, ?, 1, '{}')`,
      [userId, username]
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
