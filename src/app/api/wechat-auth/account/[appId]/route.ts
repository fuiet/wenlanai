import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

// 获取当前用户ID
async function getUserIdFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return null;
    }
    
    const result = await query(
      `SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()`,
      [sessionToken]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].user_id;
    }
    return null;
  } catch (error) {
    console.error('验证会话失败:', error);
    return null;
  }
}

// 延迟初始化Supabase客户端
const createSupabaseClient = () => {
  const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * DELETE /api/wechat-auth/account/[appId]
 * 解绑公众号 - 必须验证用户身份和数据归属
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    // 验证用户身份
    const userId = await getUserIdFromCookie();
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

    const supabase = createSupabaseClient();
    
    // 如果Supabase未配置，返回模拟成功
    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: '解绑成功（演示模式）',
        demo: true,
      });
    }

    // 从数据库删除 - 必须验证 user_id 归属
    const { error } = await supabase
      .from('wechat_accounts')
      .delete()
      .eq('app_id', appId)
      .eq('user_id', userId);  // 只删除属于当前用户的记录

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
