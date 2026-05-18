import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 获取当前用户ID
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;

  const result = await query(
    `SELECT user_id FROM sessions 
     WHERE token = ? AND expires_at > NOW()`,
    [token]
  );

  return result.rows.length > 0 ? result.rows[0].user_id : null;
}

// 获取会员资料
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const result = await query(
      `SELECT 
        mp.id,
        mp.username,
        u.email,
        u.nickname,
        u.created_at,
        mp.vip_level,
        mp.vip_expire_at,
        mp.categories
       FROM member_profiles mp
       JOIN users u ON u.id = mp.user_id
       WHERE mp.user_id = ?`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const profile = result.rows[0];

    // 获取统计数据
    const articleCount = await query(
      `SELECT COUNT(*) as count FROM articles WHERE author = ?`,
      [profile.username]
    );

    const promptCount = await query(
      `SELECT COUNT(*) as count FROM prompt_templates WHERE user_id = ?`,
      [userId]
    );

    const favoriteCount = await query(
      `SELECT COUNT(*) as count FROM favorites WHERE user_id = ?`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        nickname: profile.nickname || profile.username,
        createdAt: profile.created_at,
        vipLevel: profile.vip_level || 1,
        vipExpireAt: profile.vip_expire_at,
        categories: profile.categories || [],
        stats: {
          articleCount: parseInt(articleCount.rows[0].count) || 0,
          promptCount: parseInt(promptCount.rows[0].count) || 0,
          favoriteCount: parseInt(favoriteCount.rows[0].count) || 0
        }
      }
    });
  } catch (error: unknown) {
    console.error('获取资料错误:', error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) || '获取失败' },
      { status: 500 }
    );
  }
}

// 更新会员资料
export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const { action, data } = await request.json();

    if (action === 'changePassword') {
      const { oldPassword, newPassword, confirmPassword } = data;

      if (!oldPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { success: false, error: '请填写所有密码字段' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: '新密码至少6位' },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: '两次密码不一致' },
          { status: 400 }
        );
      }

      // 验证旧密码
      const userResult = await query(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      const oldHash = hashPassword(oldPassword);
      if (userResult.rows[0].password_hash !== oldHash) {
        return NextResponse.json(
          { success: false, error: '旧密码错误' },
          { status: 400 }
        );
      }

      // 更新密码
      const newHash = hashPassword(newPassword);
      await query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newHash, userId]
      );

      return NextResponse.json({
        success: true,
        message: '密码修改成功'
      });
    }

    if (action === 'updateCategories') {
      const { categories } = data;

      await query(
        'UPDATE member_profiles SET categories = ? WHERE user_id = ?',
        [categories, userId]
      );

      return NextResponse.json({
        success: true,
        message: '兴趣赛道已保存'
      });
    }

    if (action === 'updateNickname') {
      const { nickname } = data;

      await query(
        'UPDATE users SET nickname = ?, updated_at = NOW() WHERE id = ?',
        [nickname, userId]
      );

      return NextResponse.json({
        success: true,
        message: '昵称已更新'
      });
    }

    return NextResponse.json(
      { success: false, error: '未知操作' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('更新资料错误:', error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) || '更新失败' },
      { status: 500 }
    );
  }
}
