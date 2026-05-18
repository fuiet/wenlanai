import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// 获取单个文章的生成状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库服务暂不可用' }, { status: 503 });
    }
    
    const { id } = await params;
    
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !article) {
      return NextResponse.json({ success: false, error: '文章不存在' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: article.id,
        task_status: article.task_status || 'pending',
        status: article.status,
        content: article.content,
        title: article.title,
        images: article.images,
        updated_at: article.updated_at
      }
    });
    
  } catch (error: any) {
    console.error('获取文章状态失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
