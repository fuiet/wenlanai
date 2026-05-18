import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库服务暂不可用' }, { status: 503 });
    }

    await request.json();

    // TODO: 恢复完整文章生成流程。当前保留稳定占位响应，避免构建阶段因旧残留代码失败。
    return NextResponse.json({ success: true, message: '文章生成功能待实现' });
  } catch (error: unknown) {
    console.error('生成文章失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error instanceof Error ? error.message : String(error)) || '服务繁忙，请稍后重试',
        errorType: 'service_error'
      },
      { status: 500 }
    );
  }
}
