import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取极致了数据网站的爆款文章
 * 
 * 说明：由于极致了数据网站(dajiala.com)使用JavaScript动态加载内容，
 * 且未提供公开API接口，无法直接通过爬取获取数据。
 * 
 * 替代方案：
 * 1. 用户可以在极致了数据网站导出数据，然后通过导入功能导入
 * 2. 或者提供该网站的API文档，我们可以通过API获取数据
 */

// 定义文章数据结构
interface DajialaArticle {
  id?: string;
  title: string;
  account: string;
  url?: string;
  reads: number;
  likes: number;
  shares: number;
  publish_date: string;
  category: string;
  snippet?: string;
  source: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, articles } = body;

    // 导入文章数据
    if (action === 'import' && Array.isArray(articles)) {
      console.log(`开始导入 ${articles.length} 篇文章`);

      const supabase = getSupabaseClient();
      const insertedArticles: DajialaArticle[] = [];
      const errors: string[] = [];

      for (const article of articles) {
        try {
          // 标准化数据格式
          const normalizedArticle: DajialaArticle = {
            title: article.title || article.name || '',
            account: article.account || article.author || article.nickname || '未知',
            url: article.url || article.link || '',
            reads: parseInt(article.reads || article.read_count || article.views || 0),
            likes: parseInt(article.likes || article.like_count || article.zan || 0),
            shares: parseInt(article.shares || article.share_count || article.forward || 0),
            publish_date: article.publish_date || article.date || new Date().toISOString().split('T')[0],
            category: article.category || '综合',
            snippet: article.snippet || article.summary || article.desc || '',
            source: '极致了数据',
          };

          if (!normalizedArticle.title) {
            continue;
          }

          // 存储到数据库
          const { data, error } = await supabase
            .from('hot_articles')
            .upsert({
              title: normalizedArticle.title,
              account: normalizedArticle.account,
              url: normalizedArticle.url || null,
              reads: normalizedArticle.reads,
              likes: normalizedArticle.likes,
              shares: normalizedArticle.shares,
              publish_date: normalizedArticle.publish_date,
              category: normalizedArticle.category,
              snippet: normalizedArticle.snippet,
              source: normalizedArticle.source,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) {
            console.error('插入文章失败:', error);
            errors.push(`插入"${normalizedArticle.title}"失败: ${error.message}`);
          } else {
            insertedArticles.push(data as DajialaArticle);
          }
        } catch (err) {
          console.error('处理文章失败:', err);
          errors.push(`处理文章失败: ${err instanceof Error ? err.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        success: true,
        importedCount: insertedArticles.length,
        totalCount: articles.length,
        errors: errors.slice(0, 10), // 最多返回10个错误
        message: `成功导入 ${insertedArticles.length}/${articles.length} 篇文章`,
      });
    }

    // 获取数据说明
    return NextResponse.json({
      success: false,
      message: '无法直接从极致了数据网站获取数据',
      instructions: {
        step1: '访问 https://www.dajiala.com 并登录您的账户',
        step2: '在网站上导出或复制爆款文章数据',
        step3: '将数据以JSON格式发送到 /api/fetch-dajiala 接口',
        example: {
          action: 'import',
          articles: [
            {
              title: '文章标题',
              account: '公众号名称',
              reads: 100000,
              likes: 5000,
              shares: 1000,
              publish_date: '2024-01-01',
              category: '情感',
            }
          ]
        }
      },
    });
  } catch (error) {
    console.error('处理请求失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '处理请求失败' },
      { status: 500 }
    );
  }
}
