import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '请填写邮箱和密码' },
        { status: 400 }
      );
    }

    // 查找用户
    const userResult = await query(
      `SELECT u.id, u.email, u.nickname, u.password_hash, u.is_active, 
              mp.username, mp.avatar, mp.vip_level, mp.vip_expire_at
       FROM users u
       LEFT JOIN member_profiles mp ON mp.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // 验证密码
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      );
    }

    // 检查用户是否激活
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: '账号已被禁用' },
        { status: 403 }
      );
    }

    // 生成会话token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

    // 删除旧会话
    await query('DELETE FROM sessions WHERE user_id = $1', [user.id]);

    // 创建新会话
    await query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, sessionToken, expiresAt]
    );

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username || user.nickname,
          avatar: user.avatar,
          vipLevel: user.vip_level || 1,
          vipExpireAt: user.vip_expire_at
        }
      }
    });

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'none', // 允许跨域
      expires: expiresAt,
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '登录失败' },
      { status: 500 }
    );
  }
}

// 获取当前登录状态
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // 查找会话
    const sessionResult = await query(
      `SELECT s.user_id, s.expires_at, 
              u.email, u.nickname,
              mp.username, mp.avatar, mp.vip_level, mp.vip_expire_at, mp.points
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN member_profiles mp ON mp.user_id = s.user_id
       WHERE s.token = $1`,
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '会话无效' },
        { status: 401 }
      );
    }

    const session = sessionResult.rows[0];

    // 检查是否过期
    if (new Date(session.expires_at) < new Date()) {
      await query('DELETE FROM sessions WHERE token = $1', [sessionToken]);
      return NextResponse.json(
        { success: false, error: '会话已过期' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: session.user_id,
          email: session.email,
          username: session.username || session.nickname,
          avatar: session.avatar,
          vipLevel: session.vip_level || 1,
          vipExpireAt: session.vip_expire_at,
          points: session.points || 0
        }
      }
    });
  } catch (error: any) {
    console.error('获取登录状态错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取登录状态失败' },
      { status: 500 }
    );
  }
}
