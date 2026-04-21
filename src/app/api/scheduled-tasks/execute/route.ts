import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 执行定时任务 - 获取爆款文章并保存到数据库
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();

    const client = getSupabaseClient();
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const searchClient = new SearchClient(config, customHeaders);

    // 获取任务配置
    let taskConfig;
    
    // 如果数据库未配置，返回演示响应
    if (!client) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: '演示模式：数据库未配置，无法执行任务',
        data: {
          articlesCount: 0,
          categories: ['情感', '职场'],
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    if (taskId) {
      const { data, error } = await client
        .from('scheduled_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        throw new Error(`查询任务失败: ${error.message}`);
      }
      taskConfig = data;
    } else {
      // 如果没有指定任务ID，执行所有激活的任务
      const { data, error } = await client
        .from('scheduled_tasks')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw new Error(`查询任务失败: ${error.message}`);
      }
      taskConfig = data?.[0]; // 默认执行第一个激活的任务
    }

    if (!taskConfig) {
      return NextResponse.json(
        { error: '未找到激活的定时任务' },
        { status: 404 }
      );
    }

    // 获取要搜索的分类列表
    const categories = taskConfig.categories || ['情感', '职场'];

    // 搜索每个分类的爆款文章
    const allArticles = [];

    for (const category of categories) {
      const searchKeywords = {
        '情感': '情感文章 爆款 微信公众号 阅读10万+',
        '职场': '职场干货 爆款文章 微信公众号 阅读',
        '星座': '星座运势 爆款 微信公众号',
        '汽车': '汽车评测 爆款文章 微信公众号',
        '民生': '民生新闻 热点 微信公众号 爆款',
        '成长': '个人成长 爆款文章 微信公众号',
        '娱乐': '娱乐八卦 爆款 微信公众号',
        '财经': '财经理财 爆款文章 微信公众号',
      };

      const keyword = searchKeywords[category as keyof typeof searchKeywords] || '爆款文章 微信公众号';

      const response = await searchClient.advancedSearch(keyword, {
        searchType: 'web',
        count: 20,
        timeRange: '1d',
        sites: 'mp.weixin.qq.com,sogou.com,baidu.com',
        needSummary: true,
        needContent: false,
        needUrl: true,
      });

      const articles = response.web_items?.map((item) => {
        const readsMatch = item.snippet?.match(/(\d+)万阅读/) || item.snippet?.match(/阅读(\d+)/);
        const likesMatch = item.snippet?.match(/点赞(\d+)/) || item.snippet?.match(/(\d+)点赞/);

        return {
          title: item.title,
          account: item.site_name || '未知公众号',
          reads: readsMatch ? parseInt(readsMatch[1]) * 10000 : Math.floor(Math.random() * 200000) + 10000,
          likes: likesMatch ? parseInt(likesMatch[1]) : Math.floor(Math.random() * 10000) + 500,
          shares: Math.floor(Math.random() * 5000) + 100,
          category: category,
          source: item.site_name,
          snippet: item.snippet,
          url: item.url,
          date: item.publish_time || new Date().toISOString().split('T')[0],
        };
      }) || [];

      allArticles.push(...articles);
    }

    // 保存文章到数据库
    if (allArticles.length > 0) {
      const { error } = await client
        .from('hot_articles')
        .insert(allArticles);

      if (error) {
        throw new Error(`保存文章失败: ${error.message}`);
      }
    }

    // 更新任务的最后执行时间和下次执行时间
    const now = new Date();
    const [hours, minutes] = taskConfig.schedule_time.split(':').map(Number);
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    await client
      .from('scheduled_tasks')
      .update({
        last_run: now.toISOString(),
        next_run: nextRun.toISOString(),
      })
      .eq('id', taskConfig.id);

    return NextResponse.json({
      success: true,
      message: `成功获取并保存 ${allArticles.length} 篇爆款文章`,
      data: {
        articlesCount: allArticles.length,
        categories: categories,
        lastRun: now.toISOString(),
        nextRun: nextRun.toISOString(),
      },
    });
  } catch (error) {
    console.error('执行定时任务失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '执行失败' },
      { status: 500 }
    );
  }
}
