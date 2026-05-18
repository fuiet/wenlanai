import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, query } from '@/lib/db';

/**
 * DELETE /api/wechat-auth/account/[appId]
 * 解绑公众号 - 必须验证用户身份和数据归属
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    const { appId } = await params;

    if (!appId) {
      return NextResponse.json(
        { success: false, message: '缺少公众号AppID' },
        { status: 400 }
      );
    }

    await query(
      'DELETE FROM wechat_accounts WHERE app_id = ? AND user_id = ?',
      [appId, userId]
    );

    return NextResponse.json({
      success: true,
      message: '解绑成功',
    });
  } catch (error) {
    console.error('解绑公众号异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}
