import { NextRequest } from 'next/server';
import { LLMClient, SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { prompt, title, searchEnabled = true } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const searchClient = new SearchClient(config, customHeaders);

    // 如果启用搜索，先获取实时数据
    let searchContext = '';
    if (searchEnabled && title) {
      try {
        console.log(`开始搜索: ${title}`);
        const searchResponse = await searchClient.advancedSearch(title, {
          searchType: 'web',
          count: 10,
          timeRange: '1m', // 只获取最近1个月的数据
          needSummary: true,
          needContent: true,
        });

        if (searchResponse.web_items && searchResponse.web_items.length > 0) {
          // 构建搜索上下文
          const searchResults = searchResponse.web_items.map((item, index) => {
            return `[搜索结果${index + 1}]
标题: ${item.title}
来源: ${item.site_name || '未知来源'}
链接: ${item.url || ''}
摘要: ${item.snippet || ''}
${item.content ? `内容: ${item.content.substring(0, 500)}...` : ''}
`;
          }).join('\n');

          searchContext = `
## 实时搜索参考资料

以下是关于"${title}"的最新搜索结果，请基于这些真实信息创作文章：

${searchResults}

---
**重要提示**：请务必基于以上真实搜索结果创作文章，确保文章内容的准确性和时效性。引用数据时请使用搜索结果中的真实数据。`;
          console.log(`搜索完成，获取到 ${searchResponse.web_items.length} 条结果`);
        }
      } catch (searchError) {
        console.error('搜索失败，继续生成:', searchError);
        searchContext = '';
      }
    }

    // 构建system prompt
    const systemPrompt = prompt || `你是一位专业的自媒体写作专家，擅长创作公众号爆款文章。你的写作风格：
1. 标题吸引人，能够抓住读者眼球
2. 开头用故事或提问引发共鸣
3. 内容实用、有深度、有价值
4. 结构清晰，逻辑严密
5. 语言生动有趣，不枯燥
6. 结尾有升华或总结
7. **重要**：必须基于提供的参考资料创作，确保内容准确、真实
8. 如有数据引用，请使用参考资料中的真实数据`;

    // 构建用户消息
    const userContent = searchContext
      ? `请根据以下标题和实时搜索参考资料，创作一篇完整的公众号文章，使用Markdown格式，字数严格控制在1200字左右（±100字）：

标题：${title}

${searchContext}

要求：
1. 文章要有明确的段落结构，适合公众号阅读
2. 使用二级标题、三级标题等分层
3. 内容要有深度和价值，提供实用的观点或建议
4. 字数严格控制在1200字左右（±100字），不要过短或过长
5. 适当使用加粗、列表等Markdown格式
6. **重要**：必须基于搜索参考资料中的真实信息创作
7. 如有数据引用，请使用参考资料中的真实数据
8. 确保内容原创且有吸引力
9. 文章要可以直接发布，格式规范
10. 结尾要有总结或升华
11. **重要：不要在文章中提及配图、插图、图片等内容，专注于纯文本创作**

文章结构建议：
- 引人入胜的开头（100-150字）
- 3-4个核心段落，每段300字左右
- 总结升华（100-150字）`
      : `请根据以下标题创作一篇完整的公众号文章，使用Markdown格式，字数严格控制在1200字左右（±100字）：

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
- 总结升华（100-150字）`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userContent },
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = llmClient.stream(messages, {
      model: 'doubao-seed-2-0-pro-260215', // 使用最新的旗舰模型
      temperature: 0.8,
      streaming: true,
    });

    const customStream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const closeOrError = (err?: Error) => {
          if (!closed) {
            closed = true;
            if (err) {
              try {
                controller.error(err);
              } catch {
                // Controller already closed, ignore
              }
            } else {
              try {
                controller.close();
              } catch {
                // Controller already closed, ignore
              }
            }
          }
        };

        try {
          for await (const chunk of stream) {
            if (closed) break;
            if (chunk.content) {
              const text = chunk.content.toString();
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
              } catch {
                // Controller closed, stop sending
                break;
              }
            }
          }
          if (!closed) {
            try {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch {
              // Ignore
            }
            closeOrError();
          }
        } catch (error) {
          console.error('流式输出错误:', error);
          closeOrError(error instanceof Error ? error : new Error(String(error)));
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
