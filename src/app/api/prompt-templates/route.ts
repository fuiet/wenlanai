import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// 获取当前用户ID
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;

  const result = await query(
    `SELECT user_id FROM sessions 
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );

  return result.rows.length > 0 ? result.rows[0].user_id : null;
}

// 获取提示词模板列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let sql = `
      SELECT 
        id, name, category, description, prompt, tags,
        author_name, personality, persona补充, field,
        target_audience, word_count, is_custom, is_public,
        usage_count, created_at, updated_at
      FROM prompt_templates 
      WHERE (is_public = true OR user_id = $1)
    `;
    const params: any[] = [userId || 'anonymous'];

    if (category) {
      sql += ` AND category = $2`;
      params.push(category);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      templates: result.rows || []
    });
  } catch (error) {
    console.error('获取提示词模板失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// 创建新的提示词模板
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

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
      wordCount,
      isPublic
    } = body;

    if (!category) {
      return NextResponse.json({ success: false, error: '请选择赛道' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ success: false, error: '提示词内容不能为空' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO prompt_templates (
        user_id, name, category, description, prompt, tags,
        author_name, personality, persona补充, field,
        target_audience, word_count, is_custom, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13)
      RETURNING *`,
      [
        userId,
        name || `提示词_${Date.now()}`,
        category,
        description || '',
        prompt,
        tags || [],
        authorName || null,
        personality || null,
        personaSupplement || null,
        field || null,
        targetAudience || null,
        wordCount || 1000,
        isPublic !== false // 默认为true，即公开
      ]
    );

    return NextResponse.json({
      success: true,
      message: '提示词创建成功',
      template: result.rows[0]
    });
  } catch (error) {
    console.error('创建提示词模板失败:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}

// 删除提示词模板
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少ID参数' }, { status: 400 });
    }

    // 只删除属于当前用户的提示词
    const result = await query(
      `DELETE FROM prompt_templates WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: '提示词不存在或无权删除' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '提示词已删除' });
  } catch (error) {
    console.error('删除提示词模板失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
