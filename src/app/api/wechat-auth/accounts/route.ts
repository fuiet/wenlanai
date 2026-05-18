import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      'SELECT id, app_id, nick_name, head_img, is_authorized, created_at FROM wechat_accounts WHERE is_authorized = true ORDER BY created_at DESC'
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
