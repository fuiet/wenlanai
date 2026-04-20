import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 根据文章内容生成配图
 */
export async function POST(request: NextRequest) {
  try {
    const { title, content, count = 3 } = await request.json();

    if (!title && !content) {
      return NextResponse.json(
        { error: '请提供标题或内容' },
        { status: 400 }
      );
    }

    // 随机生成2-3张图片
    const imageCount = Math.min(Math.max(count, 2), 3);

    console.log(`开始生成 ${imageCount} 张图片: ${title}`);

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 分析文章内容，提取关键词和主题
    let articleSummary = '';
    let mainKeywords: string[] = [];
    
    if (content) {
      // 提取中文关键词（简化逻辑）
      const chineseText = content.replace(/[^\u4e00-\u9fa5]/g, ' ');
      const words: string[] = chineseText.split(/\s+/).filter((w: string) => (w as string).length >= 2);
      
      // 统计词频
      const wordCount: Record<string, number> = {};
      words.forEach((w: string) => {
        wordCount[w] = (wordCount[w] || 0) + 1;
      });
      
      // 获取高频词作为关键词
      mainKeywords = Object.entries(wordCount)
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 10)
        .map(([w]: [string, number]) => w);
      
      // 提取摘要（开头200字）
      articleSummary = content.substring(0, 200).replace(/\n/g, ' ').trim();
    }

    // 提取文章主题
    const extractTheme = () => {
      const titleLower = title?.toLowerCase() || '';
      const summaryLower = articleSummary.toLowerCase();
      
      // 根据关键词判断主题
      if (mainKeywords.some(k => ['爱情', '情感', '感情', '分手', '婚姻', '恋爱'].includes(k))) {
        return '情感故事';
      }
      if (mainKeywords.some(k => ['职场', '工作', '领导', '同事', '升职', '辞职'].includes(k))) {
        return '职场话题';
      }
      if (mainKeywords.some(k => ['孩子', '教育', '家长', '学校', '老师', '学习'].includes(k))) {
        return '教育话题';
      }
      if (mainKeywords.some(k => ['健康', '养生', '医生', '身体', '疾病', '医院'].includes(k))) {
        return '健康养生';
      }
      if (mainKeywords.some(k => ['美食', '烹饪', '餐厅', '吃', '食谱'].includes(k))) {
        return '美食生活';
      }
      if (mainKeywords.some(k => ['旅行', '旅游', '景点', '酒店', '机票'].includes(k))) {
        return '旅行见闻';
      }
      if (mainKeywords.some(k => ['理财', '投资', '股票', '赚钱', '存钱', '省钱'].includes(k))) {
        return '财经话题';
      }
      if (mainKeywords.some(k => ['科技', '手机', '电脑', 'AI', '互联网'].includes(k))) {
        return '科技资讯';
      }
      
      return '生活分享';
    };

    const theme = extractTheme();
    const keywords = mainKeywords.slice(0, 5).join('、');

    // 为每张图片生成不同的提示词
    const imagePrompts: string[] = [];

    for (let i = 0; i < imageCount; i++) {
      let imagePrompt = '';

      if (title && content) {
        // 根据文章内容生成相关性强的提示词
        const promptTemplates = [
          // 开头配图
          i === 0 
            ? `微信公众号文章封面配图，主题："${title}"，关键词：${keywords}，${theme}场景，现代简约风格，温暖色调，适合手机阅读，高清精美，2K分辨率，竖版构图，**纯视觉设计，禁止任何文字、字母、数字、二维码、条码，图片中不得包含任何可读文字**`
            : `微信公众号文章内页插图，第${i + 1}张，主题相关："${title}"，${theme}场景插画，温馨治愈风格，清新配色，简洁大方，2K分辨率，**纯视觉设计，禁止任何文字、字母、数字、二维码、条码，图片中不得包含任何可读文字**`,
        ];
        
        imagePrompt = promptTemplates[i % promptTemplates.length];
      } else if (title) {
        imagePrompt = `微信公众号文章配图，主题："${title}"，${theme}场景，现代简约风格，温暖色调，适合手机阅读，高清精美，2K分辨率，**纯视觉设计，禁止任何文字、字母、数字、二维码、条码，图片中不得包含任何可读文字**`;
      } else if (articleSummary) {
        imagePrompt = `微信公众号文章插图，内容摘要：${articleSummary}，${theme}相关插画，温馨治愈风格，2K分辨率，**纯视觉设计，禁止任何文字、字母、数字、二维码、条码，图片中不得包含任何可读文字**`;
      }

      imagePrompts.push(imagePrompt);
    }

    // 批量生成图片
    const requests = imagePrompts.map(prompt => ({
      prompt,
      size: '2K',
      watermark: false,
    }));

    const responses = await client.batchGenerate(requests);
    const imageUrls: string[] = [];

    responses.forEach((response, i) => {
      const helper = client.getResponseHelper(response);

      if (helper.success && helper.imageUrls && helper.imageUrls.length > 0) {
        imageUrls.push(helper.imageUrls[0]);
      } else {
        console.error(`图片 ${i + 1} 生成失败:`, helper.errorMessages);
      }
    });

    console.log(`成功生成 ${imageUrls.length}/${imageCount} 张图片，主题：${theme}，关键词：${keywords}`);

    if (imageUrls.length === 0) {
      throw new Error('生成图片失败，未返回任何图片');
    }

    return NextResponse.json({
      success: true,
      imageUrls,
      message: `图片生成成功（${theme}风格）`,
    });
  } catch (error) {
    console.error('生成图片失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成图片失败' },
      { status: 500 }
    );
  }
}
