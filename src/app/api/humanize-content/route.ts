import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 降低AI率/人类化内容改写API
 * 将AI生成的内容改写得更自然、更具人性特征
 */
export async function POST(request: NextRequest) {
  try {
    const { content, detectResult } = await request.json();

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: '文章内容太短，无法进行改写' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 将文章分段
    const paragraphs: string[] = content.split(/\n\n+/).filter((p: string) => p.trim().length > 50);
    
    // 构建改写提示词
    const systemPrompt = `你是一位专业的人类化写作专家，擅长将AI生成的文章改写成更自然、更有个人风格的文本。

## 你的改写原则：
1. **打破规整句式**：将对称句式改得更有变化，避免机械对齐
2. **增加口语化**：适当加入口语化表达、俚语，让文字更亲切
3. **添加个人特色**：加入个人经历、情感流露、独特观点
4. **变化过渡方式**：避免"首先...其次...最后..."等固定模式，使用更自然的过渡
5. **丰富用词**：避免重复用词，增加表达多样性
6. **情感真实**：让文字有温度、有情感，而不是冷冰冰的描述
7. **保留核心意思**：改写时不要改变文章的核心观点和信息

## 改写技巧：
- 将长句拆短，或将短句合并
- 加入问句、反问、感叹句
- 使用更接地气的表达
- 添加具体场景描述
- 融入个人视角和感受

## 输出格式（严格JSON）：
{
  "rewrittenContent": "改写后的完整文章（Markdown格式）",
  "changedParagraphs": 改写的段落数量,
  "humanizationRate": 人类化程度（0-100）,
  "changes": [
    {
      "index": 段落序号,
      "original": "原文（保留完整）",
      "rewritten": "改写后（保留完整）",
      "techniques": ["使用的改写技巧1", "使用的改写技巧2"]
    }
  ],
  "tips": ["继续保持的建议1", "继续保持的建议2"]
}

## 重要要求：
1. 只改写有AI特征的段落，保持人工写作段落不变
2. 每段改写后要保留原文的核心意思
3. 返回的JSON必须是有效格式
4. 改写后的文章要保持可读性和逻辑连贯`;

    // 如果有检测结果，使用检测结果来指导改写
    let userContent = `请将以下文章的AI段落改写成更自然的文本：

`;

    if (detectResult && detectResult.paragraphs) {
      userContent += `根据以下检测结果进行针对性改写：
${detectResult.paragraphs.map((p: { index: number; source: string; reasons: string[] }) => 
        p.source === 'AI生成' ? `段落${p.index + 1}需要改写，原因：${p.reasons.join('、')}` : ''
      ).filter(Boolean).join('\n')}

`;
    }

    userContent += `\n原文内容：

${paragraphs.map((p: string, i: number) => `[段落${i + 1}]\n${p}`).join('\n\n')}

请严格按照JSON格式返回改写结果。`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.8, // 较高温度保证多样性
    });

    const resultText = response.content.trim();
    
    // 解析JSON结果
    let result;
    try {
      let jsonText = resultText;
      if (resultText.includes('```json')) {
        jsonText = resultText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      }
      if (resultText.includes('```')) {
        jsonText = resultText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      return NextResponse.json({
        error: '改写结果解析失败，请重试',
        rawResult: resultText
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...result,
      originalLength: content.length,
      rewrittenLength: result.rewrittenContent?.length || 0,
    });
  } catch (error) {
    console.error('内容改写失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '内容改写失败' },
      { status: 500 }
    );
  }
}
