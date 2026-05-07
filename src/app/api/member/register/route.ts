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

    // 验证用户名格式
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { success: false, error: '用户名长度需要在2-20个字符之间' },
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

    // 检查用户名是否已存在
    const existingUser = await query(
      'SELECT id FROM member_profiles WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: '该用户名已被使用' },
        { status: 400 }
      );
    }

    // 加密密码
    const passwordHash = hashPassword(password);

    // 创建用户（使用 username 作为唯一标识）
    const userResult = await query(
      `INSERT INTO users (email, nickname, password_hash, is_active) 
       VALUES ($1, $2, $3, true) 
       RETURNING id`,
      [`${username}_${Date.now()}@local.com`, username, passwordHash]
    );

    const userId = userResult.rows[0].id;

    // 创建会员资料
    await query(
      `INSERT INTO member_profiles (user_id, username, vip_level, categories) 
       VALUES ($1, $2, 1, '{}')`,
      [userId, username]
    );

    return NextResponse.json({
      success: true,
      message: '注册成功，请登录'
    });
  } catch (error: any) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '注册失败' },
      { status: 500 }
    );
  }
}
