import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// GET /api/articles - 获取文章列表
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      // 演示模式，返回空列表
      return NextResponse.json({ success: true, articles: [] });
    }

    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取文章失败:', error);
      return NextResponse.json({ success: false, message: '获取文章失败' }, { status: 500 });
    }

    // 转换数据格式：将 images 转换为 image_urls
    const formattedArticles = (articles || []).map(article => ({
      ...article,
      image_urls: article.images || []
    }));

    return NextResponse.json({ success: true, articles: formattedArticles });
  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/articles - 删除文章
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '文章ID不能为空' }, { status: 400 });
    }

    if (!supabase) {
      // 演示模式
      return NextResponse.json({ success: true, message: '演示模式：文章已删除' });
    }

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除文章失败:', error);
      return NextResponse.json({ success: false, message: '删除文章失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '文章已删除' });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// POST /api/articles - 创建文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, image_urls, group_id, status, push_status } = body;

    if (!title) {
      return NextResponse.json({ success: false, message: '标题不能为空' }, { status: 400 });
    }

    if (!supabase) {
      // 演示模式
      const mockArticle = {
        id: Date.now(),
        title,
        content: content || '',
        image_urls: image_urls || [],
        group_id: group_id || null,
        status: status || 'generated',
        push_status: push_status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return NextResponse.json({ success: true, article: mockArticle });
    }

    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        title,
        content: content || '',
        image_urls: image_urls || [],
        group_id: group_id || null,
        status: status || 'generated',
        push_status: push_status || 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('创建文章失败:', error);
      return NextResponse.json({ success: false, message: '创建文章失败' }, { status: 500 });
    }

    // 转换返回数据格式：将 images 转换为 image_urls
    const formattedArticle = article ? {
      ...article,
      image_urls: article.images || []
    } : null;

    // 更新分组的文章数量
    if (group_id) {
      const { data: group } = await supabase
        .from('article_groups')
        .select('article_count')
        .eq('id', group_id)
        .single();
      
      if (group) {
        await supabase
          .from('article_groups')
          .update({ article_count: (group.article_count || 0) + 1 })
          .eq('id', group_id);
      }
    }

    return NextResponse.json({ success: true, article: formattedArticle });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
