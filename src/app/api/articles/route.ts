import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

// GET /api/articles - 获取当前用户的文章列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    
    if (!userId) {
      // 未登录，返回空列表
      return NextResponse.json({ success: true, articles: [] });
    }

    const result = await query(
      `SELECT * FROM articles 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    // 转换数据格式
    const articles = (result.rows || []).map(article => ({
      ...article,
      image_urls: article.images || []
    }));

    return NextResponse.json({ success: true, articles });
  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json({ success: false, message: '获取文章失败' }, { status: 500 });
  }
}

// POST /api/articles - 创建文章
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, image_urls, group_id, status, push_status } = body;

    if (!title) {
      return NextResponse.json({ success: false, message: '标题不能为空' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO articles (user_id, title, content, images, group_id, status, push_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, title, content || '', image_urls || [], group_id || null, status || 'generated', push_status || 'pending']
    );

    const article = {
      ...result.rows[0],
      image_urls: result.rows[0].images || []
    };

    return NextResponse.json({ success: true, article });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json({ success: false, message: '创建文章失败' }, { status: 500 });
  }
}

// DELETE /api/articles - 删除文章
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '文章ID不能为空' }, { status: 400 });
    }

    // 只删除属于当前用户的文章
    const result = await query(
      `DELETE FROM articles WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: '文章不存在或无权删除' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '文章已删除' });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json({ success: false, message: '删除文章失败' }, { status: 500 });
  }
}
