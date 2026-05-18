import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;
  try {
    const result: any = await query(
      'SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    if (result.rows && result.rows.length > 0) {
      return String(result.rows[0].user_id);
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ success: true, articles: [] });
    }
    const result: any = await query(
      'SELECT * FROM articles WHERE created_by = ? ORDER BY created_at DESC',
      [userId]
    );
    return NextResponse.json({ success: true, articles: result.rows || [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }
    const body = await request.json();
    const { title, content, group_id } = body;
    if (!title || !content) {
      return NextResponse.json({ success: false, error: '标题和内容不能为空' }, { status: 400 });
    }
    await query(
      'INSERT INTO articles (title, content, created_by, group_id, created_at) VALUES (?, ?, ?, ?, NOW())',
      [title, content, userId, group_id || null]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}
