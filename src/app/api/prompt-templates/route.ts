import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

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
    
    if (result.rows && result.rows.length > 0) {
      return result.rows[0].user_id;
    }
    return null;
  } catch (error) {
    console.error('验证会话失败:', error);
    return null;
  }
}

export async function GET() {
  try {
    const userId = await getUserIdFromCookie();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }
    
    const result = await query(
      `SELECT id, name, category, description, prompt, tags, author_name, 
              personality, persona_supplement, field, target_audience, word_count,
              is_custom, is_public, usage_count, created_at, updated_at
       FROM prompt_templates 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return NextResponse.json({
      success: true,
      templates: result.rows || []
    });
  } catch (error) {
    console.error('获取提示词失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromCookie();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, category, description, prompt, tags, personality, field, targetAudience, wordCount, authorName } = body;
    
    if (!name || !prompt) {
      return NextResponse.json({ success: false, error: '缺少必填字段' }, { status: 400 });
    }
    
    const id = uuidv4();
    
    await query(
      `INSERT INTO prompt_templates 
       (id, user_id, name, category, description, prompt, content, tags, author_name, 
        personality, persona_supplement, field, target_audience, word_count, is_custom, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        name,
        category || '未分类',
        description || '',
        prompt,
        prompt,
        JSON.stringify(tags || []),
        authorName || '匿名',
        personality || null,
        null,
        field || null,
        targetAudience || null,
        wordCount || 1000,
        true,
        true
      ]
    );
    
    return NextResponse.json({
      success: true,
      template: { id, name }
    });
  } catch (error) {
    console.error('创建提示词失败:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromCookie();
    
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少ID参数' }, { status: 400 });
    }
    
    await query(
      `DELETE FROM prompt_templates WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除提示词失败:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
