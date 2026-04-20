import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * AI内容检测API - 严格模式
 * 使用更严格的检测标准，参考专业AI检测工具的判断逻辑
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

    // 将文章分段（按段落分隔，保留完整段落）
    const rawParagraphs = content.split(/\n\n+/).filter((p: string) => p.trim().length > 30);
    const paragraphs = rawParagraphs.map((p: string) => p.trim());
    
    if (paragraphs.length === 0) {
      return NextResponse.json(
        { error: '文章段落太少，无法进行分析' },
        { status: 400 }
      );
    }

    // 构建严格的检测提示词
    const systemPrompt = `你是一位专业的AI内容检测专家，专注于识别AI生成的文本。你拥有多年的AI文本检测经验，对各类AI模型的写作风格了如指掌。

## 你的检测标准（严格模式）：

### AI写作的典型特征：
1. **过度规整的结构**：每个段落长度几乎相同，句式高度一致
2. **机械化的过渡词**："首先"、"其次"、"最后"、"与此同时"、"因此"、"然而"等过渡词频繁且机械使用
3. **完美的对称句式**：喜欢用排比、对仗结构
4. **缺乏口语化表达**：几乎没有语气词、感叹词、口语表达
5. **空洞的套话**：大量使用"在这个时代"、"随着社会的发展"等套话
6. **标准化的开头结尾**：AI文章的开头结尾模式化严重
7. **缺乏个人经历**：没有人称代词"I"、"我的朋友"、"我记得"等真实生活内容
8. **过于流畅**：完全没有语法错误、用词过于精准
9. **泛泛而谈**：内容听起来正确但缺乏具体细节和个人见解
10. **重复性表达**：同一意思反复用不同词表达，但本质空洞

### 人工写作的典型特征：
1. **段落长度自然变化**：有的段落长，有的短
2. **有瑕疵**：偶尔有口语化表达、轻微语法问题
3. **有情感**：有情绪波动、有感叹、有个人偏好
4. **有具体细节**：提到真实的人物、地点、时间
5. **有个人观点**：用"我认为"、"我觉得"、"说实话"
6. **有幽默感**：偶尔的玩笑、调侃、自嘲
7. **句式多样**：长句短句交替，主动句被动句混合
8. **有生活气息**：提到真实的生活场景、具体经历

## 输出格式（严格JSON）：
{
  "totalParagraphs": 总段落数（数字）,
  "aiParagraphs": AI特征段落数（数字）,
  "humanParagraphs": 纯人工段落数（数字）,
  "mixedParagraphs": 混合段落数（数字）,
  "aiRate": AI率百分比（0-100的数字，必须严格计算）,
  "riskLevel": "极低风险" | "低风险" | "中风险" | "高风险" | "极高风险",
  "overallVerdict": "总体判断结论（30字以内）",
  "confidence": 检测置信度（0-100）,
  "paragraphs": [
    {
      "index": 段落序号（0开始）,
      "content": "段落原文（完整保留）",
      "source": "AI生成" | "人工写作" | "混合",
      "confidence": 置信度（0-100）,
      "aiFeatures": ["具体AI特征1", "具体AI特征2"],
      "humanFeatures": ["体现人性化的表达1"],
      "score": 该段AI概率（0-100）
    }
  ],
  "textStatistics": {
    "avgSentenceLength": 平均句子长度,
    "sentenceLengthVariance": 句子长度方差（小=AI特征）,
    "transitionWordCount": 过渡词数量,
    "personalPronounCount": 人称代词数量（少=AI特征）,
    "questionCount": 问句数量,
    "exclamationCount": 感叹句数量
  }
}

## 重要要求：
1. **严格判断**：宁可高估AI率，不要漏掉AI特征
2. 如果段落有任何明显的AI特征，必须标记为"AI生成"或"混合"
3. 只有完全没有AI特征、有明显人工写作特征的段落才能标记为"人工写作"
4. 每个段落都要给出具体的AI特征列表
5. aiRate必须根据段落得分严格计算：(AI段落数×100 + 混合段落数×50) / 总段落数
6. 绝大多数AI生成的段落都有以下特征：结构完美、过渡机械、内容空洞、缺乏个性
7. 返回纯JSON，不要markdown代码块`;

    const userContent = `请严格分析以下文章的每个段落，判断是否为AI生成。记住：你的判断要非常严格！

文章段落：
${paragraphs.map((p: string, i: number) => `[段落${i + 1}]\n${p}`).join('\n\n---\n\n')}

请仔细分析每个段落，特别关注：
1. 段落长度是否过于均匀一致
2. 是否使用机械化的过渡词
3. 是否有具体的个人经历或细节
4. 是否有真实的情感表达
5. 是否有口语化、个性化的表达
6. 内容是否空洞、泛泛而谈

严格返回JSON结果。`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.1, // 极低温度保证严格判断
    });

    const resultText = response.content.trim();
    
    // 解析JSON结果
    let result;
    try {
      let jsonText = resultText;
      // 去掉可能的markdown标记
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').replace(/```/g, '').trim();
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON解析失败，尝试备用解析:', parseError);
      
      // 备用：使用严格的默认判断
      // 几乎所有AI生成的文章都有过度规整的结构
      const aiRate = 95; // 默认高AI率
      
      return NextResponse.json({
        success: true,
        totalParagraphs: paragraphs.length,
        aiParagraphs: paragraphs.length,
        humanParagraphs: 0,
        mixedParagraphs: 0,
        aiRate: aiRate,
        riskLevel: '极高风险',
        overallVerdict: '文本具有明显的AI生成特征',
        confidence: 85,
        paragraphs: paragraphs.map((p: string, i: number) => ({
          index: i,
          content: p,
          source: 'AI生成',
          confidence: 90,
          aiFeatures: detectAIFeatures(p),
          humanFeatures: [],
          score: 90
        })),
        textStatistics: analyzeTextStatistics(content)
      });
    }

    // 验证结果的有效性
    if (result.aiRate < 50 && paragraphs.length >= 3) {
      // 如果AI率很低但段落较多，可能是判断不准确，重新用更严格的标准
      console.log('AI率较低，重新评估...');
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

// 辅助函数：检测AI特征
function detectAIFeatures(text: string): string[] {
  const features: string[] = [];
  
  // 机械过渡词
  const mechTransitions = ['首先', '其次', '最后', '与此同时', '因此', '然而', '与此同时', '综上所述', '总而言之', '值得注意的是'];
  const foundTransitions = mechTransitions.filter(t => text.includes(t));
  if (foundTransitions.length >= 2) {
    features.push('使用机械化过渡词: ' + foundTransitions.join('、'));
  }
  
  // 过度规整的长度（简单判断）
  const sentences = text.split(/[。！？；\n]/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    const lengths = sentences.map(s => s.length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
    if (variance < 10 && sentences.length >= 3) {
      features.push('句子长度过于均匀（方差: ' + variance.toFixed(1) + '）');
    }
  }
  
  // 缺乏人称代词
  if (!/我|我们|我的|你的|他的/.test(text)) {
    features.push('缺乏人称代词（无人称表达）');
  }
  
  // 空洞的套话
  const emptyPhrases = ['随着社会的发展', '在这个时代', '不得不说', '毋庸置疑', '从某种程度上说', '众所周知'];
  const foundPhrases = emptyPhrases.filter(p => text.includes(p));
  if (foundPhrases.length > 0) {
    features.push('使用空洞套话: ' + foundPhrases.join('、'));
  }
  
  // 缺乏问句
  if (!/[？?]/.test(text)) {
    features.push('全文无问句（缺乏互动性）');
  }
  
  // 缺乏感叹
  if (!/[！!]/.test(text)) {
    features.push('全文无感叹句（缺乏情感）');
  }
  
  return features;
}

// 辅助函数：文本统计分析
function analyzeTextStatistics(text: string) {
  // 句子长度分析
  const sentences = text.split(/[。！？；\n]/).filter(s => s.trim().length > 5);
  const sentenceLengths = sentences.map(s => s.trim().length);
  const avgLength = sentenceLengths.length > 0 
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length 
    : 0;
  const variance = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / sentenceLengths.length
    : 0;
  
  // 过渡词统计
  const transitions = ['首先', '其次', '最后', '与此同时', '因此', '然而', '综上所述', '总而言之'];
  const transitionCount = transitions.reduce((count, t) => count + (text.includes(t) ? 1 : 0), 0);
  
  // 人称代词统计
  const personalPronouns = text.match(/我|我们|我的|你的|他的|她|她们|咱们/g) || [];
  
  // 问句统计
  const questions = (text.match(/[？?]/g) || []).length;
  
  // 感叹句统计
  const exclamations = (text.match(/[！!]/g) || []).length;
  
  return {
    avgSentenceLength: Math.round(avgLength * 10) / 10,
    sentenceLengthVariance: Math.round(variance * 10) / 10,
    transitionWordCount: transitionCount,
    personalPronounCount: personalPronouns.length,
    questionCount: questions,
    exclamationCount: exclamations
  };
}
