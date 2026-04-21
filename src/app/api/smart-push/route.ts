import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 智能推送 - 根据用户偏好推送爆款文章
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    const client = getSupabaseClient();

    // 如果数据库未配置，返回空数据和默认偏好
    if (!client) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: [],
        preferences: {
          preferred_categories: ['情感', '职场'],
          min_reads: 10000,
          search_strategy: 'default',
          custom_keywords: [],
        },
        message: '数据库未配置，无法获取文章',
      });
    }

    // 获取用户偏好设置
    let userPreferences;
    if (userId) {
      const { data, error } = await client
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(`查询用户偏好失败: ${error.message}`);
      }
      userPreferences = data;
    } else {
      // 如果没有用户ID，使用默认配置
      const { data, error } = await client
        .from('user_preferences')
        .select('*')
        .limit(1);

      if (error) {
        throw new Error(`查询用户偏好失败: ${error.message}`);
      }
      userPreferences = data?.[0];
    }

    // 如果没有用户偏好，使用默认配置
    const preferences = userPreferences || {
      preferred_categories: ['情感', '职场'],
      min_reads: 10000,
      search_strategy: 'default',
    };

    // 根据用户偏好构建查询
    let query = client
      .from('hot_articles')
      .select('*')
      .gte('reads', preferences.min_reads || 10000)
      .order('reads', { ascending: false })
      .limit(20);

    // 根据偏好分类过滤
    if (preferences.preferred_categories && preferences.preferred_categories.length > 0) {
      query = query.in('category', preferences.preferred_categories);
    }

    // 根据搜索策略调整
    if (preferences.search_strategy === 'aggressive') {
      // 激进策略：更多文章，不限制阅读量
      query = client
        .from('hot_articles')
        .select('*')
        .order('reads', { ascending: false })
        .limit(50);
    } else if (preferences.search_strategy === 'conservative') {
      // 保守策略：只推荐高阅读量文章
      query = client
        .from('hot_articles')
        .select('*')
        .gte('reads', 50000)
        .order('reads', { ascending: false })
        .limit(10);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`查询爆款文章失败: ${error.message}`);
    }

    // 根据自定义关键词过滤
    let filteredArticles = (data || []) as Array<{ title: string; snippet?: string | null; [key: string]: unknown }>;
    if (preferences.custom_keywords && preferences.custom_keywords.length > 0) {
      const keywords = preferences.custom_keywords as string[];
      filteredArticles = filteredArticles.filter((article: { title: string; snippet?: string | null }) =>
        keywords.some(keyword =>
          article.title.toLowerCase().includes(keyword.toLowerCase()) ||
          article.snippet?.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredArticles,
      preferences: preferences,
      message: `为您推送 ${filteredArticles.length} 篇爆款文章`,
    });
  } catch (error) {
    console.error('智能推送失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '推送失败' },
      { status: 500 }
    );
  }
}
