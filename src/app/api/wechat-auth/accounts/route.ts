import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '请先登录', accounts: [] },
        { status: 401 }
      );
    }

    const result = await query(
      `SELECT id, app_id, nick_name, head_img, is_authorized, created_at
       FROM wechat_accounts
       WHERE user_id = ? AND is_authorized = true
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return NextResponse.json({
      success: true,
      accounts: result.rows || []
    });
  } catch (error) {
    console.error('获取公众号列表失败:', error);
    return NextResponse.json({
      success: false,
      accounts: []
    });
  }
}
