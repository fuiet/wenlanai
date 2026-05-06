import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 提示词生成请求类型
interface GeneratePromptRequest {
  raceType: 'link' | 'text';
  raceContent: string;
  persona: {
    authorName: string;
    personality: string;
    personaSupplement: string;
  };
  articleConfig: {
    field: string;
    targetAudience: string;
    noSubheading: boolean;
    wordCount: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePromptRequest = await request.json();
    const { raceType, raceContent, persona, articleConfig } = body;

    // 构建分析提示词
    let analysisPrompt = `你是一位顶尖的自媒体写作专家，擅长分析文章风格并提炼写作提示词。\n\n`;

    // 添加赛道内容分析
    if (raceType === 'link') {
      analysisPrompt += `请分析以下链接对应的文章内容，理解其写作风格、内容结构和爆款元素：\n${raceContent}\n\n`;
    } else {
      analysisPrompt += `请分析以下文章内容，理解其写作风格、内容结构和爆款元素：\n${raceContent}\n\n`;
    }

    // 添加人设信息
    analysisPrompt += `## 人设信息\n`;
    if (persona.authorName) {
      analysisPrompt += `- 作者名称：${persona.authorName}\n`;
    }
    if (persona.personality) {
      analysisPrompt += `- 人物性格：${persona.personality}\n`;
    }
    if (persona.personaSupplement) {
      analysisPrompt += `- 人设补充：${persona.personaSupplement}\n`;
    }

    // 添加文章配置
    analysisPrompt += `\n## 文章配置\n`;
    analysisPrompt += `- 文章领域：${articleConfig.field}\n`;
    analysisPrompt += `- 目标受众：${articleConfig.targetAudience}\n`;
    analysisPrompt += `- 二级标题：${articleConfig.noSubheading ? '不使用二级标题，纯段落式' : '需要二级标题分隔内容'}\n`;
    analysisPrompt += `- 字数要求：约${articleConfig.wordCount}字\n`;

    // 添加输出要求
    analysisPrompt += `\n## 输出要求\n`;
    analysisPrompt += `请生成一段完整的AI写作提示词，要求：\n`;
    analysisPrompt += `1. 开头介绍你的身份定位\n`;
    analysisPrompt += `2. 说明你的写作风格和特点\n`;
    analysisPrompt += `3. 明确文章的结构要求\n`;
    analysisPrompt += `4. 强调目标受众和预期效果\n`;
    analysisPrompt += `5. 提出具体的写作要求\n`;
    analysisPrompt += `6. 如果有参考文章，融入其风格特点\n\n`;
    analysisPrompt += `请直接输出提示词内容，不要其他解释说明。`;

    // 调用 LLM 生成提示词
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'user' as const, content: analysisPrompt }
    ];

    // 使用 stream 方法生成内容
    const stream = llmClient.stream(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.7,
      streaming: false,
    });

    // 获取完整响应
    let generatedPrompt = '';
    for await (const chunk of stream) {
      if (chunk.content) {
        generatedPrompt += chunk.content.toString();
      }
    }
    generatedPrompt = generatedPrompt.trim();

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      analyzed: {
        raceType,
        persona,
        articleConfig
      }
    });

  } catch (error) {
    console.error('生成提示词失败:', error);
    return NextResponse.json(
      { success: false, error: '生成提示词失败，请稍后重试' },
      { status: 500 }
    );
  }
}
