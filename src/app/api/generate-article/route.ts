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

    // 从用户提示词中解析字数要求，默认为1000字左右
    let wordCountRequirement = '1000字左右（±100字，约900-1100字）';
    const wordPatterns = [
      /约\s*([0-9]+)\s*字/,
      /([0-9]+)\s*字左右/,
      /字数[为是]?\s*([0-9]+)/,
      /([0-9]+)\s*字.*左右/,
      /控制在\s*([0-9]+)\s*字/,
      /[约大约]\s*([0-9]+)\s*字/,
    ];
    
    for (const pattern of wordPatterns) {
      const match = prompt.match(pattern);
      if (match && match[1]) {
        const targetWord = parseInt(match[1]);
        // 如果字数在合理范围内（500-3000），使用这个字数
        if (targetWord >= 500 && targetWord <= 3000) {
          const minWord = Math.floor(targetWord * 0.9);
          const maxWord = Math.ceil(targetWord * 1.1);
          wordCountRequirement = `${targetWord}字左右（±${Math.floor(targetWord * 0.1)}字，约${minWord}-${maxWord}字）`;
          break;
        }
      }
    }
    
    // 构建用户消息 - 强制1000字左右
    const wordCountReq = '1000字左右（±100字，约900-1100字）';
    const userContent = searchContext
      ? `请根据以下标题和实时搜索参考资料，创作一篇公众号文章。

## 【硬性要求】字数必须控制在 ${wordCountReq}

标题：${title}

${searchContext}

## 文章要求：
1. **【必须】文章总字数严格控制在 ${wordCountReq}**
2. 文章要有明确的段落结构（建议3-5个段落）
3. 使用二级标题、三级标题等分层
4. 内容要有深度和价值
5. **重要**：必须基于搜索参考资料中的真实信息创作
6. 文章结尾要有总结或升华
7. **重要：不要在文章中提及配图、插图等内容，专注于纯文本**

## 【字数控制技巧】
- 开头引入：约100-150字
- 每个核心段落：约150-200字
- 总结升华：约100-150字
- 总计：约900-1100字

---
**【严格检查】生成完毕后，必须自行统计纯中文字数，确保在900-1100字之间！超出必须删除多余内容！**`
      : `请根据以下标题创作一篇公众号文章。

## 【硬性要求】字数必须控制在 ${wordCountReq}

标题：${title}

## 文章要求：
1. **【必须】文章总字数严格控制在 ${wordCountReq}**
2. 文章要有明确的段落结构（建议3-5个段落）
3. 使用二级标题、三级标题等分层
4. 内容要有深度和价值
5. 文章结尾要有总结或升华
6. **重要：不要在文章中提及配图、插图等内容，专注于纯文本**

## 【字数控制技巧】
- 开头引入：约100-150字
- 每个核心段落：约150-200字
- 总结升华：约100-150字
- 总计：约900-1100字

---
**【严格检查】生成完毕后，必须自行统计纯中文字数，确保在900-1100字之间！超出必须删除多余内容！**`;

    const messages = [
      { role: 'system' as const, content: `${systemPrompt}

【重要】你是专业的公众号文章写作专家。
【重要】你的核心职责是创作高质量、字数精准的公众号文章。
【重要】字数必须严格控制在 ${wordCountReq}，这是最高优先级！
【重要】生成后必须检查字数，超出必须精简！` },
      { role: 'user' as const, content: userContent },
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = llmClient.stream(messages, {
      model: 'deepseek-v3-2-251201', // 使用 DeepSeek V3 模型
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
