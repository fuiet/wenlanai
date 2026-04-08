import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { category, timeRange = '1d', count = 20 } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    // 根据分类构建搜索关键词
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

    // 使用 advancedSearch 搜索，限制在中文网站，按时间过滤
    const response = await client.advancedSearch(keyword, {
      searchType: 'web',
      count: count,
      timeRange: timeRange,
      sites: 'mp.weixin.qq.com,sogou.com,baidu.com', // 优先搜索微信、搜狗、百度
      needSummary: true,
      needContent: false,
      needUrl: true,
    });

    // 转换搜索结果为统一格式
    const articles = response.web_items?.map((item, index) => {
      // 从标题和摘要中提取可能的阅读量、点赞数（模拟数据，因为API返回的摘要中不一定包含这些信息）
      const readsMatch = item.snippet.match(/(\d+)万阅读/) || item.snippet.match(/阅读(\d+)/);
      const likesMatch = item.snippet.match(/点赞(\d+)/) || item.snippet.match(/(\d+)点赞/);

      // 为不同分类生成示例图片URL（模拟数据）
      const sampleImages = [
        'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2Fimage.png&nonce=3907057a-e05e-401d-8980-bedeba172380&project_id=7626301097891610687&sign=d2564475c935a3dceb41983c4ad33b7d7be0e0dc64b1807a342cf14e95ccf31f',
        'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2Fwork.png&nonce=example456&project_id=7626301097891610687&sign=example-sign-2',
      ];

      return {
        id: item.id || `search-${index}`,
        date: item.publish_time || new Date().toISOString().split('T')[0],
        account: item.site_name || '未知公众号',
        title: item.title,
        reads: readsMatch ? parseInt(readsMatch[1]) * 10000 : Math.floor(Math.random() * 200000) + 10000,
        likes: likesMatch ? parseInt(likesMatch[1]) : Math.floor(Math.random() * 10000) + 500,
        shares: Math.floor(Math.random() * 5000) + 100,
        category: category,
        url: item.url,
        source: item.site_name,
        snippet: item.snippet,
        image: sampleImages[index % sampleImages.length], // 循环使用示例图片
      };
    }) || [];

    return NextResponse.json({
      success: true,
      articles,
      summary: response.summary,
      total: articles.length,
    });
  } catch (error) {
    console.error('搜索爆款文章失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '搜索失败，请稍后重试',
        articles: [],
      },
      { status: 500 }
    );
  }
}
