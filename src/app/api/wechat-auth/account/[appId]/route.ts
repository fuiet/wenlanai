import { NextRequest, NextResponse } from 'next/server';

// 延迟初始化Supabase客户端
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey);
};

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

    const supabase = createSupabaseClient();
    
    // 如果Supabase未配置，返回模拟成功
    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: '解绑成功（演示模式）',
        demo: true,
      });
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
