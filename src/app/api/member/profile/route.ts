import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取当前会员资料
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 查找会话
    const sessionResult = await query(
      `SELECT s.user_id, s.expires_at,
              u.email, u.nickname, u.is_active, u.created_at,
              mp.*
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
        id: session.user_id,
        email: session.email,
        username: session.username || session.nickname,
        nickname: session.nickname,
        avatar: session.avatar,
        phone: session.phone,
        gender: session.gender,
        birthday: session.birthday,
        bio: session.bio,
        company: session.company,
        position: session.position,
        website: session.website,
        wechat: session.wechat,
        qq: session.qq,
        vipLevel: session.vip_level,
        vipExpireAt: session.vip_expire_at,
        points: session.points,
        isActive: session.is_active,
        createdAt: session.created_at
      }
    });
  } catch (error: any) {
    console.error('获取会员资料错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取会员资料失败' },
      { status: 500 }
    );
  }
}

// 更新会员资料
export async function PUT(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 查找会话
    const sessionResult = await query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '会话无效或已过期' },
        { status: 401 }
      );
    }

    const userId = sessionResult.rows[0].user_id;
    const body = await request.json();

    // 验证用户名唯一性（如果修改了用户名）
    if (body.username) {
      const existingUsername = await query(
        'SELECT id FROM member_profiles WHERE username = $1 AND user_id != $2',
        [body.username, userId]
      );

      if (existingUsername.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: '该用户名已被使用' },
          { status: 400 }
        );
      }
    }

    // 更新用户表
    if (body.nickname) {
      await query(
        'UPDATE users SET nickname = $1, updated_at = NOW() WHERE id = $2',
        [body.nickname, userId]
      );
    }

    // 更新会员资料表
    const allowedFields = [
      'username', 'phone', 'avatar', 'gender', 'birthday',
      'bio', 'company', 'position', 'website', 'wechat', 'qq'
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(userId);

      await query(
        `UPDATE member_profiles SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
        values
      );
    }

    return NextResponse.json({
      success: true,
      message: '资料更新成功'
    });
  } catch (error: any) {
    console.error('更新会员资料错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新资料失败' },
      { status: 500 }
    );
  }
}
