import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * AI内容检测API
 * 分析文章段落，识别AI生成特征，标记可疑段落
 */
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: '文章内容太短，无法进行有效检测' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 将文章分段
    const paragraphs: string[] = content.split(/\n\n+/).filter((p: string) => p.trim().length > 50);
    
    if (paragraphs.length === 0) {
      return NextResponse.json(
        { error: '文章段落太少，无法进行分析' },
        { status: 400 }
      );
    }

    // 构建分析提示词
    const systemPrompt = `你是一位专业的AI内容检测专家，擅长识别AI生成文本的特征。你需要分析用户提供的文章，逐段判断是否为AI生成，并给出详细的分析报告。

## 你的判断标准包括：
1. **语言风格特征**：AI写作通常用词正式、结构规整、缺乏口语化表达
2. **句式特征**：AI倾向于使用对称句式、排比结构、完美对仗
3. **内容特征**：AI生成内容往往逻辑严密但缺乏个人情感、独特观点
4. **过渡特征**：段落间过渡生硬，常用"首先...其次...最后..."、"一方面...另一方面..."等固定模式
5. **情感特征**：缺乏真实情感流露，用词中规中矩

## 输出格式（严格遵循JSON格式）：
{
  "totalParagraphs": 段落总数,
  "aiParagraphs": AI特征段落数量,
  "humanParagraphs": 人工写作段落数量,
  "aiRate": AI率百分比（数字）,
  "riskLevel": "低风险" | "中风险" | "高风险",
  "summary": "总体评估摘要（50字以内）",
  "paragraphs": [
    {
      "index": 段落序号（从0开始）,
      "content": "段落原文（保留完整）",
      "source": "AI生成" | "人工写作" | "混合",
      "confidence": 置信度（0-100的数字）,
      "reasons": ["特征1", "特征2"],
      "suggestions": "修改建议（如果需要）"
    }
  ],
  "features": {
    "overlyStructured": 是否过度结构化（boolean）,
    "lacksPersonality": 是否缺乏个人特色（boolean）,
    "repetitivePatterns": 是否存在重复模式（boolean）,
    "formalTone": 是否语气过于正式（boolean）,
    "emotionalVacancy": 是否情感空洞（boolean）
  }
}

## 重要要求：
1. 每个段落都要单独分析
2. 置信度低于60%的段落标记为"混合"
3. reasons数组要具体指出该段落的AI特征
4. 返回的JSON必须是有效格式，不要有额外的markdown标记`;

    const userContent = `请分析以下文章的每个段落，判断是否为AI生成：

${paragraphs.map((p: string, i: number) => `[段落${i + 1}]\n${p}`).join('\n\n')}

请严格按照上述JSON格式返回分析结果。`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    // 使用较短的max_tokens，因为我们只需要JSON结果
    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.3, // 低温度保证格式稳定
    });

    const resultText = response.content.trim();
    
    // 解析JSON结果
    let result;
    try {
      // 尝试提取JSON（去掉可能的markdown代码块）
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
      // 返回原始结果作为fallback
      return NextResponse.json({
        success: true,
        rawResult: resultText,
        totalParagraphs: paragraphs.length,
        aiRate: 50,
        riskLevel: '中风险',
        summary: '分析完成，请查看详细结果',
        paragraphs: paragraphs.map((p: string, i: number) => ({
          index: i,
          content: p,
          source: '待检测',
          confidence: 0,
          reasons: [],
          suggestions: ''
        }))
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      originalLength: content.length,
      paragraphCount: paragraphs.length,
    });
  } catch (error) {
    console.error('AI检测失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI检测失败' },
      { status: 500 }
    );
  }
}
