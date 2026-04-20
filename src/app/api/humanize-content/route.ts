import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 降低AI率/人类化内容改写API - 强化版
 * 使用更彻底的方法将AI生成的内容改写成更像真人写作
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
    const paragraphs: string[] = content.split(/\n\n+/).filter((p: string) => p.trim().length > 30);
    
    // 构建强化的改写提示词
    const systemPrompt = `你是一位专业的人类化写作专家，擅长将AI生成的文章彻底改写成真人写作风格。

## 你的改写原则（必须全部执行）：

### 1. 打破坏死的结构模式
- AI文章段落长度几乎相同 → 故意让段落长度有变化
- 有的段落长，有的段落短，自然错落

### 2. 增加真实的口语化表达
- 添加语气词："说实话"、"其实"、"你知道吗"、"说实话我也没想到"
- 添加感叹："太牛了！"、"真的绝了"、"没想到会这样"
- 添加犹豫："可能吧"、"大概"、"应该是这样"
- 添加口头禅：偶尔的"那个"、"然后"、"嗯"

### 3. 注入真实的个人元素
- 加入第一人称视角："我上次"、"我有个朋友"、"我自己也遇到过"
- 加入具体的真实细节：真实的时间（去年3月、周末、下班后）、真实的地点（地铁上、公司楼下、朋友聚会）
- 加入真实的情绪：开心、失落、惊讶、无奈、纠结

### 4. 打破机械的过渡
- 删除所有"首先、其次、最后、综上所述"
- 用自然的过渡："说真的"、"不过话说回来"、"说到这个"
- 有时候干脆不用过渡，直接跳转到下一个话题

### 5. 增加真实的内容细节
- 加入具体的数字（不要模糊的"很多"、"一些"）
- 加入具体的人物、场景描述
- 加入个人判断和偏好："我更喜欢"、"我觉得A比B好"、"说实话我不喜欢"

### 6. 增加句式变化
- 主动句和被动句混合
- 短句和长句交替
- 陈述句和问句交替

### 7. 删除空洞的套话
- 删除"随着社会的发展"、"在这个时代"、"不得不说"
- 删除"众所周知"、"毋庸置疑"
- 删除"从某种程度上说"、"一般来说"

## 改写技巧示例：
原文："首先，我们需要认识到心理健康的重要性。其次，保持良好的心态对我们的生活有很大的帮助。最后，希望大家都能够关注自己的心理健康。"
改写："说实话，我以前也不太在意心理健康，觉得年轻嘛扛一扛就过去了。但后来真的扛不住了...说真的，现在回想起来，心理健康真的太重要了。

"

原文："随着互联网的发展，人们的生活变得更加便利。"
改写："现在用手机点个外卖，30分钟就能送到家门口，方便得不要不要的。"

## 输出格式（严格JSON）：
{
  "rewrittenContent": "改写后的完整文章（Markdown格式，保留原文的标题和格式）",
  "changedParagraphs": 改写的段落数量,
  "humanizationScore": 人类化程度评分（0-100，改写后应该>=80）,
  "keyChanges": ["主要改动1", "主要改动2", "主要改动3"],
  "changes": [
    {
      "index": 段落序号（0开始）,
      "original": "原文（完整保留）",
      "rewritten": "改写后（完整保留）",
      "techniques": ["使用的改写技巧1", "使用的改写技巧2"]
    }
  ],
  "finalTips": "最终建议（如何继续保持人类化）"
}

## 重要要求：
1. 改写必须彻底，不能只改表面
2. 每段都要有明显的改变痕迹
3. 改写后的文章要让人感觉是一个真实的人在说话
4. 保留原文的核心观点和信息
5. 不要改变文章的基本结构
6. 返回纯JSON`;

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

请按照上述原则，对每个段落进行彻底的改写。特别注意：
1. 每段都要改，不能偷懒
2. 改写要有明显的效果，能看出人工痕迹
3. 加入真实的口语化表达
4. 删除所有空洞的套话
5. 让文章读起来像真人在说话

严格返回JSON结果。`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.9, // 高温度保证改写多样性
    });

    const resultText = response.content.trim();
    
    // 解析JSON结果
    let result;
    try {
      let jsonText = resultText;
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').replace(/```/g, '').trim();
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      
      // 如果解析失败，返回错误但给出提示
      return NextResponse.json({
        error: '改写结果格式错误，请重试',
        hint: '建议减少文章长度后再试'
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
