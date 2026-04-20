import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 降低AI率/人类化内容改写API - 强化版
 */
export async function POST(request: NextRequest) {
  try {
    const { content, detectResult } = await request.json();

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { success: false, error: '文章内容太短，无法进行改写' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 将文章分段
    const paragraphs: string[] = content.split(/\n\n+/).filter((p: string) => p.trim().length > 30);
    
    // 构建强化的改写提示词
    const systemPrompt = `你是一位专业的人类化写作专家，擅长将AI生成的文章彻底改写成真人写作风格。

## 改写原则：

### 1. 打破坏死的结构模式
- 有的段落长，有的段落短，自然错落

### 2. 增加真实的口语化表达
- 添加语气词："说实话"、"其实"、"你知道吗"
- 添加感叹："太牛了！"、"真的绝了"
- 添加犹豫："可能吧"、"大概"

### 3. 注入真实的个人元素
- 加入第一人称视角："我上次"、"我有个朋友"、"我自己也遇到过"
- 加入具体的真实细节：真实的时间、地点、场景
- 加入真实的情绪：开心、失落、惊讶、无奈

### 4. 打破机械的过渡
- 删除所有"首先、其次、最后、综上所述"
- 用自然的过渡："说真的"、"不过话说回来"

### 5. 删除空洞的套话
- 删除"随着社会的发展"、"在这个时代"、"不得不说"
- 删除"众所周知"、"毋庸置疑"

## 输出格式（严格JSON）：
{
  "rewrittenContent": "改写后的完整文章（Markdown格式，保留原文的标题和格式）",
  "changedParagraphs": 改写的段落数量,
  "humanizationScore": 人类化程度评分（0-100）,
  "keyChanges": ["主要改动1", "主要改动2"],
  "changes": [
    {
      "index": 段落序号（0开始）,
      "original": "原文（完整保留）",
      "rewritten": "改写后（完整保留）",
      "techniques": ["使用的改写技巧1", "使用的改写技巧2"]
    }
  ],
  "finalTips": "最终建议"
}

重要：返回纯JSON，不要markdown代码块`;

    // 构建用户消息
    let userContent = `请将以下文章的每个段落都进行彻底的人类化改写。

`;
    
    if (detectResult && detectResult.paragraphs) {
      userContent += `检测结果显示，以下段落需要重点改写：
`;
      detectResult.paragraphs.forEach((p: { index: number; source: string; aiFeatures: string[] }) => {
        if (p.source === 'AI生成' || p.source === '混合') {
          userContent += `段落${p.index + 1}：${p.aiFeatures?.join('；') || 'AI特征'}\n`;
        }
      });
      userContent += `\n`;
    }

    userContent += `原文内容：

${paragraphs.map((p: string, i: number) => `[段落${i + 1}]\n${p}`).join('\n\n---\n\n')}

请按照原则对每个段落进行彻底改写，让文章读起来像真人在说话。返回JSON结果。`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.9,
    });

    const resultText = response.content.trim();
    console.log('Humanize API response length:', resultText.length);
    
    // 解析JSON结果
    let result;
    try {
      let jsonText = resultText;
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').replace(/```/g, '').trim();
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      return NextResponse.json({
        success: false,
        error: '改写结果格式解析失败',
        hint: '请稍后重试'
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
      { success: false, error: error instanceof Error ? error.message : '内容改写失败' },
      { status: 500 }
    );
  }
}
