import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 初始化Supabase客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * DELETE /api/wechat-auth/account/[appId]
 * 解绑公众号
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    if (!appId) {
      return NextResponse.json(
        { success: false, message: '缺少公众号AppID' },
        { status: 400 }
      );
    }

    // 从数据库删除
    const { error } = await supabase
      .from('wechat_accounts')
      .delete()
      .eq('app_id', appId);

    if (error) {
      console.error('删除公众号失败:', error);
      return NextResponse.json(
        { success: false, message: '删除失败' },
        { status: 500 }
      );
    }

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
