import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 分析文章并生成提示词总结
 */
export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return Response.json(
        { error: '请提供文章标题和内容' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建分析提示词
    const systemPrompt = `你是一位专业的自媒体内容分析师，擅长分析爆款文章的特点，并提炼出可复用的创作提示词。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: `请分析以下文章的标题和内容，从以下四个维度进行深入分析，并给出详细的提示词总结：

## 文章标题
${title}

## 文章内容
${content}

## 分析维度

### 1. 人设分析
- 分析文章作者的人设定位（年龄、职业、性格特点）
- 分析作者的表达方式和语言风格
- 分析作者与读者的关系定位

### 2. 文笔分析
- 分析文章的语言特点（口语化/书面语、幽默/严肃等）
- 分析修辞手法和表达技巧
- 分析句式特点和节奏感

### 3. 思路分析
- 分析文章的结构框架
- 分析开头、结尾的处理方式
- 分析段落之间的逻辑关系
- 分析如何引发读者共鸣

### 4. 排版分析
- 分析文章的分段方式
- 分析标题层级的使用
- 分析重点内容的呈现方式（加粗、列表等）
- 分析图片和文字的配合

## 输出要求

请按以下JSON格式输出分析结果：

\`\`\`json
{
  "persona": {
    "定位": "人设定位描述",
    "特点": ["特点1", "特点2", "特点3"]
  },
  "writingStyle": {
    "语言特点": "语言特点描述",
    "表达技巧": ["技巧1", "技巧2", "技巧3"],
    "句式特点": "句式特点描述"
  },
  "structure": {
    "文章结构": "结构描述",
    "开头方式": "开头方式描述",
    "结尾方式": "结尾方式描述",
    "逻辑关系": ["关系1", "关系2"]
  },
  "format": {
    "分段方式": "分段方式描述",
    "标题层级": "标题层级描述",
    "重点呈现": ["呈现方式1", "呈现方式2"]
  },
  "prompt": "可用于AI创作的完整提示词"
}
\`\`\`

请确保分析准确、详尽，提示词可以直接用于AI创作类似风格的文章。`
      },
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = client.stream(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
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
    console.error('分析文章失败:', error);
    return Response.json(
      { error: '分析文章失败，请稍后重试' },
      { status: 500 }
    );
  }
}
