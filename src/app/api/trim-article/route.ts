import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 文章字数精简API - 将文章精简到指定字数范围内
 */
export async function POST(request: NextRequest) {
  try {
    const { content, targetCount = 1000, tolerance = 100 } = await request.json();

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { success: false, error: '文章内容太短' },
        { status: 400 }
      );
    }

    // 计算当前纯文字字数
    const cleanContent = content.replace(/[#*`_\[\]()>~]/g, '').trim();
    const currentCount = cleanContent.length;
    
    // 如果已经在范围内，直接返回
    if (Math.abs(currentCount - targetCount) <= tolerance) {
      return NextResponse.json({
        success: true,
        content,
        originalCount: currentCount,
        finalCount: currentCount,
        trimmed: false,
        message: '字数已在要求范围内'
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位文章精简专家，擅长将文章精简到指定字数，同时保留核心内容和阅读体验。

## 要求：
1. 保留文章的核心观点和重要信息
2. 删除冗余表达、重复内容和不必要的修饰词
3. 合并可以合并的句子
4. 保持文章结构清晰
5. 保持原文的语气和风格
6. **重要：严格控制字数在目标范围内**
7. **不要改变文章的原意**
8. **保留所有二级标题、三级标题**

## 输出格式：
只返回精简后的文章内容（Markdown格式），不要包含任何解释或说明。`;

    const userContent = `请将以下文章精简到${targetCount}字左右（允许±${tolerance}字的误差）。

原文（共约${currentCount}字）：
${content}

请返回精简后的文章。`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.3, // 低温度保证精简质量
    });

    const resultText = response.content.trim();
    
    // 清理结果
    const trimmedContent = resultText
      .replace(/^```markdown\n?/g, '')
      .replace(/^```\n?$/g, '')
      .replace(/\n?```$/g, '')
      .trim();
    
    // 计算最终字数
    const finalCleanContent = trimmedContent.replace(/[#*`_\[\]()>~]/g, '').trim();
    const finalCount = finalCleanContent.length;

    return NextResponse.json({
      success: true,
      content: trimmedContent,
      originalCount: currentCount,
      finalCount,
      trimmed: true,
      message: `已从${currentCount}字精简到${finalCount}字`
    });
  } catch (error) {
    console.error('文章精简失败:', error);
    return NextResponse.json(
      { success: false, error: '精简失败，请稍后重试' },
      { status: 500 }
    );
  }
}
