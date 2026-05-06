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
    let analysisPrompt = `你是一位顶尖的自媒体写作专家，专注于分析爆款文章并提炼出可直接使用的AI写作提示词。

你的任务是根据用户提供的素材，分析并生成一个完整的、可直接用于生成文章的提示词模板。

`;

    // 添加赛道内容
    if (raceType === 'link') {
      analysisPrompt += `## 待分析素材（链接内容）
请分析以下链接对应的文章，理解其写作风格、内容结构、爆款元素：
${raceContent}
`;
    } else {
      analysisPrompt += `## 待分析素材（文本内容）
请分析以下文章，理解其写作风格、内容结构、爆款元素：
${raceContent}
`;
    }

    // 添加人设信息
    if (persona.authorName || persona.personality || persona.personaSupplement) {
      analysisPrompt += `
## 人设信息（需要融入提示词）
`;
      if (persona.authorName) {
        analysisPrompt += `- 作者名称：${persona.authorName}\n`;
      }
      if (persona.personality) {
        analysisPrompt += `- 人物性格：${persona.personality}\n`;
      }
      if (persona.personaSupplement) {
        analysisPrompt += `- 人设补充：${persona.personaSupplement}\n`;
      }
    }

    // 添加文章配置
    analysisPrompt += `
## 文章配置要求
`;
    if (articleConfig.field) {
      analysisPrompt += `- 文章领域：${articleConfig.field}\n`;
    }
    if (articleConfig.targetAudience) {
      analysisPrompt += `- 目标受众：${articleConfig.targetAudience}\n`;
    }
    analysisPrompt += `- 二级标题：${articleConfig.noSubheading ? '不使用二级标题，纯段落式' : '需要二级标题分隔内容'}\n`;
    analysisPrompt += `- 字数要求：约${articleConfig.wordCount}字\n`;

    // 添加输出要求
    analysisPrompt += `
## 输出要求
请生成一个完整的AI写作提示词模板，要求包含以下7个部分，严格按此格式输出：

---
# AI写作提示词模板

## 一、角色定位
【你是一位XX领域的专业自媒体作者，擅长XX风格，专注于XX主题。你深谙目标读者的痛点和需求，能够用通俗易懂的语言传递专业价值。】

## 二、写作风格
【描述具体的写作风格特点】
- 语言特点：...
- 表达方式：...
- 情感基调：...
- 特色元素：...（如：善用故事、数据、案例、引用等）

## 三、文章结构
【描述文章的整体结构框架】
- 开头方式：...
- 段落安排：...
- 结尾方式：...

## 四、内容要点
【从参考文章中提炼的核心内容和主题】
- 核心观点：...
- 关键信息：...
- 必含元素：...

## 五、受众定位
【描述目标读者的特征、需求和阅读期待】
- 读者画像：...
- 阅读期待：...
- 痛点共鸣：...

## 六、写作要求
【具体的写作技巧和要求】
1. ...
2. ...
3. ...

## 七、排版规范
【格式要求】
- 字数：约${articleConfig.wordCount}字（±${Math.floor(articleConfig.wordCount * 0.1)}字）
- 二级标题：${articleConfig.noSubheading ? '不使用' : '使用 ## 二级标题'}
- 引用块：使用 > 引用重要观点
- 列表：使用 - 列举要点
- 强调：使用 **加粗** 突出重点

---
【结尾引导】
写完后，检查是否符合以上所有要求，确保字数精准、排版规范。
`;

    // 初始化 LLM 客户端
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'user' as const, content: analysisPrompt }
    ];

    console.log('[generate-prompt-template] 开始调用LLM生成提示词...');
    
    // 使用 invoke 方法（非流式调用）
    const response = await llmClient.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.7,
    });

    const generatedPrompt = response.content;
    console.log('[generate-prompt-template] 提示词生成成功，长度:', generatedPrompt.length);

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
    });

  } catch (error) {
    console.error('[generate-prompt-template] 生成提示词失败:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage || '生成提示词失败' },
      { status: 500 }
    );
  }
}
