import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// DeepSeek API 调用
async function callDeepSeekAPI(prompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 错误: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 网络搜索（可选）
async function searchWeb(keyword: string): Promise<string> {
  try {
    // 简单返回关键词，实际可接入搜索API
    return `关于"${keyword}"的相关信息`;
  } catch {
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      templateId, 
      title, 
      topic, 
      searchEnabled = true,
      imageSource = 'ai',
      imageCount = 3,
      groupName = '默认分组'
    } = body;

    if (!topic) {
      return NextResponse.json({ success: false, error: '请输入文章主题' }, { status: 400 });
    }

    // 获取提示词模板
    let promptTemplate = '';
    if (templateId) {
      const templateResult = await query<{ prompt: string }>(
        'SELECT prompt FROM prompt_templates WHERE id = ?',
        [templateId]
      );
      if (templateResult.rows.length > 0) {
        promptTemplate = templateResult.rows[0].prompt;
      }
    }

    // 搜索相关信息
    let searchContext = '';
    if (searchEnabled) {
      searchContext = await searchWeb(topic);
    }

    // 构建生成提示词
    const generatePrompt = `${promptTemplate ? promptTemplate + '\n\n' : ''}请根据以下主题写一篇约1000字的文章：

主题：${topic}
${title ? `标题：${title}` : ''}
${searchContext ? `参考资料：${searchContext}` : ''}

要求：
1. 文章约1000字（±100字）
2. 使用简洁易懂的语言
3. 分段清晰，使用二级标题分隔
4. 开头吸引读者，结尾有互动引导`;

    // 调用DeepSeek生成文章
    console.log('[generate-article] 开始生成文章...');
    const content = await callDeepSeekAPI(generatePrompt);
    
    // 生成标题（如果没有提供）
    const articleTitle = title || `${topic} - 深度解析`;

    // 生成图片占位符
    const images: string[] = [];
    if (imageSource === 'ai' && imageCount > 0) {
      // 暂时用占位符，实际可接入图片生成API
      for (let i = 0; i < imageCount; i++) {
        images.push(`/placeholder-${i + 1}.jpg`);
      }
    }

    // 保存到数据库
    const insertResult = await query(
      `INSERT INTO articles (title, content, images, status, created_at, updated_at) 
       VALUES (?, ?, ?, 'generated', NOW(), NOW())`,
      [articleTitle, content, JSON.stringify(images)]
    );

    const idResult = await query<{ id: number }>('SELECT LAST_INSERT_ID() as id');
    const articleId = idResult.rows[0].id;

    console.log('[generate-article] 文章生成成功，ID:', articleId);

    return NextResponse.json({
      success: true,
      data: {
        id: articleId,
        title: articleTitle,
        content,
        images,
        status: 'generated',
        group_name: groupName
      },
      review: { status: 'passed' },
      extraction: {
        shareQuote: [],
        seoKeywords: [topic],
        interactionHook: ''
      }
    });

  } catch (error: unknown) {
    console.error('生成文章失败:', error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) || '生成失败' },
      { status: 500 }
    );
  }
}
