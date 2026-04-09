import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { prompt, title } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建system prompt
    const systemPrompt = prompt || `你是一位专业的自媒体写作专家，擅长创作公众号爆款文章。你的写作风格：
1. 标题吸引人，能够抓住读者眼球
2. 开头用故事或提问引发共鸣
3. 内容实用、有深度、有价值
4. 结构清晰，逻辑严密
5. 语言生动有趣，不枯燥
6. 结尾有升华或总结

请根据提供的标题，创作一篇高质量的公众号文章。文章格式使用Markdown。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: `请根据以下标题创作一篇完整的公众号文章，使用Markdown格式，字数严格控制在1200字左右（±100字）：

标题：${title}

要求：
1. 文章要有明确的段落结构，适合公众号阅读
2. 使用二级标题、三级标题等分层
3. 内容要有深度和价值，提供实用的观点或建议
4. 字数严格控制在1200字左右（±100字），不要过短或过长
5. 适当使用加粗、列表等Markdown格式
6. 确保内容原创且有吸引力
7. 文章要可以直接发布，格式规范
8. 结尾要有总结或升华
9. **重要：不要在文章中提及配图、插图、图片等内容，专注于纯文本创作**

文章结构建议：
- 引人入胜的开头（100-150字）
- 3-4个核心段落，每段300字左右
- 总结升华（100-150字）`
      },
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = client.stream(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.8,
      streaming: true,
    });

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('生成文章失败:', error);
    return Response.json(
      { error: '生成文章失败，请稍后重试' },
      { status: 500 }
    );
  }
}
