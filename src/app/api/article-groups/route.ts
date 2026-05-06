import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// GET /api/article-groups - 获取分组列表
export async function GET() {
  try {
    if (!supabase) {
      // 演示模式，返回示例分组
      return NextResponse.json({ 
        success: true, 
        groups: [
          { id: 1, name: '默认分组', article_count: 0, created_at: new Date().toISOString() }
        ] 
      });
    }

    const { data: groups, error } = await supabase
      .from('article_groups')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('获取分组失败:', error);
      return NextResponse.json({ success: false, message: '获取分组失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, groups: groups || [] });
  } catch (error) {
    console.error('获取分组失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// POST /api/article-groups - 创建分组
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '分组名称不能为空' }, { status: 400 });
    }

    if (!supabase) {
      // 演示模式
      const mockGroup = {
        id: Date.now(),
        name: name.trim(),
        article_count: 0,
        created_at: new Date().toISOString()
      };
      return NextResponse.json({ success: true, group: mockGroup });
    }

    const { data: group, error } = await supabase
      .from('article_groups')
      .insert({
        name: name.trim(),
        article_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('创建分组失败:', error);
      return NextResponse.json({ success: false, message: '创建分组失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, group });
  } catch (error) {
    console.error('创建分组失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// PUT /api/article-groups - 更新分组
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const { name } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: '分组ID不能为空' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '分组名称不能为空' }, { status: 400 });
    }

    if (!supabase) {
      // 演示模式
      return NextResponse.json({ success: true, message: '更新成功' });
    }

    const { error } = await supabase
      .from('article_groups')
      .update({ name: name.trim() })
      .eq('id', parseInt(id));

    if (error) {
      console.error('更新分组失败:', error);
      return NextResponse.json({ success: false, message: '更新分组失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新分组失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/article-groups - 删除分组
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '分组ID不能为空' }, { status: 400 });
    }

    if (!supabase) {
      // 演示模式
      return NextResponse.json({ success: true, message: '删除成功' });
    }

    // 将该分组的文章移到未分组状态
    await supabase
      .from('articles')
      .update({ group_id: null })
      .eq('group_id', parseInt(id));

    const { error } = await supabase
      .from('article_groups')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('删除分组失败:', error);
      return NextResponse.json({ success: false, message: '删除分组失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除分组失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
