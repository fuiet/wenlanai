import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 保存爆款文章到数据库
 */
export async function POST(request: NextRequest) {
  try {
    const { articles } = await request.json();

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { error: '文章列表不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 批量插入文章
    const articlesToInsert = articles.map((article: {
      title: string;
      account: string;
      reads: number;
      likes: number;
      shares: number;
      category: string;
      source?: string;
      snippet?: string;
      url?: string;
      date?: string;
    }) => ({
      title: article.title,
      account: article.account,
      reads: article.reads,
      likes: article.likes,
      shares: article.shares,
      category: article.category,
      source: article.source,
      snippet: article.snippet,
      url: article.url,
      publish_date: article.date,
    }));

    const { data, error } = await client
      .from('hot_articles')
      .insert(articlesToInsert)
      .select();

    if (error) {
      throw new Error(`保存失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: `成功保存 ${data?.length || 0} 篇文章`,
    });
  } catch (error) {
    console.error('保存爆款文章失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取已保存的爆款文章
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'fetch_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const client = getSupabaseClient();

    let query = client
      .from('hot_articles')
      .select('*')
      .order(sortBy as 'fetch_date' | 'reads' | 'created_at', { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (category && category !== '全部') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('获取爆款文章失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除爆款文章
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '文章ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { error } = await client
      .from('hot_articles')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(`删除失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除爆款文章失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
