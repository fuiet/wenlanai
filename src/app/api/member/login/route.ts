import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '@/lib/db';

const USERNAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,20}$/;

function hashLegacyPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function verifyPassword(password: string, storedHash: string): Promise<{ valid: boolean; shouldMigrate: boolean }> {
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return { valid: await bcrypt.compare(password, storedHash), shouldMigrate: false };
  }

  const validLegacyPassword = hashLegacyPassword(password) === storedHash;
  return { valid: validLegacyPassword, shouldMigrate: validLegacyPassword };
}

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
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const userResult = await query<{ id: string | number; nickname: string | null; password_hash: string; username: string; vip_level: number | null; vip_expire_at: string | null }>(
      `SELECT u.id, u.nickname, u.password_hash, mp.username, mp.vip_level, mp.vip_expire_at
       FROM users u
       JOIN member_profiles mp ON mp.user_id = u.id
       WHERE mp.username = ? AND u.is_active = true`,
      [normalizedUsername]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];
    const passwordCheck = await verifyPassword(password, user.password_hash);

    if (!passwordCheck.valid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    if (passwordCheck.shouldMigrate) {
      const migratedHash = await bcrypt.hash(password, 12);
      await query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [migratedHash, user.id]);
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await query(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [user.id, token, expiresAt]
    );

    const userData = {
      id: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      vipLevel: user.vip_level || 1
    };

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: { user: userData }
    });

    const isProduction = process.env.COZE_PROJECT_ENV === 'PROD' || process.env.NODE_ENV === 'production';
    response.cookies.set('session_token', token, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
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
