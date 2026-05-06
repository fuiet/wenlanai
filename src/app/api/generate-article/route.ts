import { NextRequest } from 'next/server';
import { LLMClient, SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { prompt, title, searchEnabled = true, templateId } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 如果传入了模板ID，获取模板详情
    let templateInfo = null;
    if (templateId) {
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('prompt_templates')
          .select('*')
          .eq('id', templateId)
          .single();
        
        if (!error && data) {
          templateInfo = data;
        }
      } catch (e) {
        console.error('获取模板失败:', e);
      }
    }

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
    let systemPrompt = '';
    
    if (templateInfo) {
      // 使用提示词模板构建system prompt
      const personaInfo = templateInfo.personality || '';
      const personaSupplement = templateInfo.persona_supplement || '';
      const authorName = templateInfo.author_name || '';
      const field = templateInfo.field || '';
      const targetAudience = templateInfo.target_audience || '';
      const wordCount = templateInfo.word_count || 1000;
      const minWord = Math.floor(wordCount * 0.95);
      const maxWord = Math.ceil(wordCount * 1.05);
      
      systemPrompt = templateInfo.prompt || `你是一位专业的公众号文章写作专家。`;
      
      // 添加人设信息
      if (authorName || personaInfo || personaSupplement) {
        systemPrompt += `

【作者人设】
${authorName ? `作者姓名：${authorName}` : ''}
${personaInfo ? `人物性格：${personaInfo}` : ''}
${personaSupplement ? `人设补充：${personaSupplement}` : ''}`;
      }
      
      // 添加文章配置
      systemPrompt += `

【文章配置】
${field ? `文章领域：${field}` : ''}
${targetAudience ? `目标受众：${targetAudience}` : ''}
字数要求：${minWord}-${maxWord}字（严格控制）`;
    } else {
      // 默认的system prompt
      systemPrompt = prompt || `你是一位专业的公众号文章写作专家，擅长创作1000字左右的爆款文章。

【核心要求】字数必须严格控制在950-1050字之间，这是最高优先级！

字数计算方法：只计算中文文字、标点和emoji，忽略Markdown符号(#*_等)

写作结构（严格按此结构）：
- 标题（# 开头）：用问句或痛点吸引眼球
- 开头（1段，约80-100字）：用故事或反问引发共鸣
- 核心段落（2-3段，每段约120-150字）：用 ## 标题分隔，每个段落3-4句话
- 总结（1段，约80-100字）：用升华或行动号召结尾

【禁止】
- 绝不能超过1100字
- 不要写5个以上段落
- 不要使用过多emoji（每篇最多3-5个）

【排版要求】
- 使用 ## 二级标题（最多2-3个）
- 使用 > 引用块突出1-2个重点
- 使用 --- 分隔线（最多1次）
- 使用 - 无序列表列举要点

请严格按以上要求创作，确保字数精准！`;
    }

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
    
    // 安全地解析prompt中的字数要求
    const promptStr = prompt || '';
    for (const pattern of wordPatterns) {
      const match = promptStr.match(pattern);
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
    
    // 构建用户消息 - 严格1000字
    const wordCountReq = '950-1050字（绝不超过1100字）';
    const userContent = searchContext
      ? `# 任务：创作一篇约1000字的公众号文章

## 标题
${title}

## 参考资料
${searchContext}

## 【严格字数要求】${wordCountReq}
- 开头：约80-100字（故事或提问）
- 核心段落：2-3段，每段约120-150字
- 总结：约80-100字
- **总字数必须控制在950-1050字之间！**

## 【结构要求】
- 开头1段 → 核心2-3段 → 总结1段
- 共4-5个段落
- 每个段落3-4句话

## 【排版要求】
- 使用 ## 二级标题（最多2-3个）
- 使用 > 引用块（1-2个）
- 使用 --- 分隔线（最多1次）
- emoji最多3-5个 💡🔥✨

## 【禁止】
- 超过1100字
- 超过5个段落
- 过多emoji

---
**完成后请统计字数，确保在950-1050字之间！**`
      : `# 任务：创作一篇约1000字的公众号文章

## 标题
${title}

## 【严格字数要求】${wordCountReq}
- 开头：约80-100字（故事或提问）
- 核心段落：2-3段，每段约120-150字
- 总结：约80-100字
- **总字数必须控制在950-1050字之间！**

## 【结构要求】
- 开头1段 → 核心2-3段 → 总结1段
- 共4-5个段落
- 每个段落3-4句话

## 【排版要求】
- 使用 ## 二级标题（最多2-3个）
- 使用 > 引用块（1-2个）
- 使用 --- 分隔线（最多1次）
- emoji最多3-5个 💡🔥✨

## 【禁止】
- 超过1100字
- 超过5个段落
- 过多emoji

---
**完成后请统计字数，确保在950-1050字之间！**`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
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
