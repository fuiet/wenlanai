import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// 获取所有提示词模板
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取提示词模板失败:', error);
      return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      templates: data || []
    });
  } catch (error) {
    console.error('获取提示词模板失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 创建新的提示词模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      description,
      prompt,
      tags,
      authorName,
      personality,
      personaSupplement,
      field,
      targetAudience,
      wordCount
    } = body;

    // 验证必填项
    if (!category) {
      return NextResponse.json({ success: false, error: '请选择赛道' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ success: false, error: '提示词内容不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('prompt_templates')
      .insert({
        name: name || `提示词_${Date.now()}`,
        category,
        description: description || '',
        prompt,
        tags: tags || [],
        author_name: authorName || null,
        personality: personality || null,
        persona补充: personaSupplement || null,
        field: field || null,
        target_audience: targetAudience || null,
        word_count: wordCount || 1000,
        is_custom: true,
      })
      .select()
      .single();

    if (error) {
      console.error('创建提示词模板失败:', error);
      return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '提示词创建成功',
      template: data
    });
  } catch (error) {
    console.error('创建提示词模板失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 删除提示词模板
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少ID参数' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('prompt_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除提示词模板失败:', error);
      return NextResponse.json({ success: false, error: '删除失败: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    console.error('删除提示词模板失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误: ' + error.message }, { status: 500 });
  }
}

// PUT 更新提示词模板
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { name, prompt, category, tags, field, targetAudience, wordCount } = body;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少ID参数' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (field !== undefined) updateData.field = field;
    if (targetAudience !== undefined) updateData.target_audience = targetAudience;
    if (wordCount !== undefined) updateData.word_count = wordCount;

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新提示词模板失败:', error);
      return NextResponse.json({ success: false, error: '更新失败: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
      template: data
    });
  } catch (error: any) {
    console.error('更新提示词模板失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误: ' + error.message }, { status: 500 });
  }
}
