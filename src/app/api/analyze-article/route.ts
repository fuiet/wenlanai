import { NextRequest, NextResponse } from 'next/server';

/**
 * DeepSeek API 调用函数
 */
async function callDeepSeekAPI(systemPrompt: string, userPrompt: string): Promise<string> {
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
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 分析文章并生成提示词总结
 */
export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: '请提供文章标题和内容' },
        { status: 400 }
      );
    }

    const systemPrompt = `你是一位专业的自媒体内容分析师，擅长分析爆款文章的特点，并提炼出可复用的创作提示词。`;

    const userPrompt = `请分析以下文章的标题和内容，从以下四个维度进行深入分析，并给出详细的提示词总结：

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

请确保分析准确、详尽，提示词可以直接用于AI创作类似风格的文章。`;

    console.log('[analyze-article] 开始调用DeepSeek API分析文章...');
    
    const result = await callDeepSeekAPI(systemPrompt, userPrompt);
    
    console.log('[analyze-article] 文章分析成功');

    return NextResponse.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('分析文章失败:', error);
    return NextResponse.json(
      { error: '分析文章失败，请稍后重试' },
      { status: 500 }
    );
  }
}
