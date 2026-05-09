import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// 验证用户并获取用户ID
async function getUserId(request?: NextRequest): Promise<{ userId: string | null; error: NextResponse | null }> {
  try {
    // 优先从请求头获取 token
    let token = request?.headers.get('Authorization')?.replace('Bearer ', '');
    
    // 如果没有，从 cookie 获取
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('session_token')?.value;
    }
    
    if (!token) {
      return { userId: null, error: NextResponse.json({ success: false, message: '未登录' }, { status: 401 }) };
    }
    
    // 验证 token
    if (!supabase) {
      // 演示模式，返回测试用户ID
      return { userId: 'demo-user-id', error: null };
    }
    
    const { data, error } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      return { userId: null, error: NextResponse.json({ success: false, message: '登录已过期' }, { status: 401 }) };
    }
    
    return { userId: data.user_id, error: null };
  } catch {
    return { userId: null, error: NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 }) };
  }
}

// GET /api/article-groups - 获取分组列表
export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getUserId(request);
    if (error) return error;
    
    if (!supabase) {
      // 演示模式，返回示例分组
      return NextResponse.json({ 
        success: true, 
        groups: [
          { id: 1, name: '默认分组', article_count: 0, created_at: new Date().toISOString() }
        ] 
      });
    }

    const { data: groups, error: queryError } = await supabase
      .from('article_groups')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (queryError) {
      console.error('获取分组失败:', queryError);
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
    const { userId, error: authError } = await getUserId(request);
    if (authError) return authError;
    
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

    const { data: group, error: insertError } = await supabase
      .from('article_groups')
      .insert({
        name: name.trim(),
        article_count: 0,
        user_id: userId
      })
      .select()
      .single();

    if (insertError) {
      console.error('创建分组失败:', insertError);
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
    const { userId, error: authError } = await getUserId(request);
    if (authError) return authError;
    
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

    const { error: updateError } = await supabase
      .from('article_groups')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      console.error('更新分组失败:', updateError);
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
    const { userId, error: authError } = await getUserId(request);
    if (authError) return authError;
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '分组ID不能为空' }, { status: 400 });
    }

    if (!supabase) {
      // 演示模式
      return NextResponse.json({ success: true, message: '删除成功' });
    }

    // 将该分组的文章移到未分组状态（只删除属于该用户的）
    await supabase
      .from('articles')
      .update({ group_id: null })
      .eq('group_id', id)
      .eq('user_id', userId);

    const { error: deleteError } = await supabase
      .from('article_groups')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('删除分组失败:', deleteError);
      return NextResponse.json({ success: false, message: '删除分组失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除分组失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
