import { NextRequest } from 'next/server';
import { LLMClient, SearchClient, ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt, 
      title, 
      searchEnabled = true, 
      templateId,
      imageSource = 'ai',
      imageCount = 3,
      enableMaterial = false,
      materialLinks = '',
      materialRequirements = '',
      groupId
    } = await request.json();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 如果传入了模板ID，获取模板详情
    let templateInfo = null;
    if (templateId) {
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('prompt_templates')
          .select('*')
          .eq('id', templateId)
          .single();
        
        if (!error && data) {
          templateInfo = data;
        }
      } catch (e) {
        console.error('获取模板失败:', e);
      }
    }

    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const searchClient = new SearchClient(config, customHeaders);
    const imageClient = new ImageGenerationClient(config, customHeaders);

    // 如果启用搜索或投喂素材，先获取实时数据
    let searchContext = '';
    if ((searchEnabled || enableMaterial) && (title || materialLinks)) {
      try {
        const searchQuery = title || materialLinks.split('\n')[0] || '';
        console.log(`开始搜索: ${searchQuery}`);
        const searchResponse = await searchClient.advancedSearch(searchQuery, {
          searchType: 'web',
          count: 10,
          timeRange: '1m',
          needSummary: true,
          needContent: true,
        });

        if (searchResponse.web_items && searchResponse.web_items.length > 0) {
          const searchResults = searchResponse.web_items.map((item, index) => {
            return `[搜索结果${index + 1}]
标题: ${item.title}
来源: ${item.site_name || '未知来源'}
链接: ${item.url || ''}
摘要: ${item.snippet || ''}
${item.content ? `内容: ${item.content.substring(0, 500)}...` : ''}
`;
          }).join('\n');

          searchContext = `
## 实时搜索参考资料

以下是关于"${searchQuery}"的最新搜索结果，请基于这些真实信息创作文章：

${searchResults}

---
**重要提示**：请务必基于以上真实搜索结果创作文章，确保文章内容的准确性和时效性。引用数据时请使用搜索结果中的真实数据。`;
          console.log(`搜索完成，获取到 ${searchResponse.web_items.length} 条结果`);
        }
      } catch (searchError) {
        console.error('搜索失败，继续生成:', searchError);
        searchContext = '';
      }
    }

    // 构建system prompt
    let systemPrompt = '';
    
    if (templateInfo && templateInfo.prompt) {
      systemPrompt = templateInfo.prompt;
      
      const wordPatterns = [
        /约\s*([0-9]+)\s*字/,
        /([0-9]+)\s*字左右/,
        /字数[为是]?\s*([0-9]+)/,
        /字数要求[：为]?\s*([0-9]+)/,
      ];
      
      let hasWordCount = false;
      for (const pattern of wordPatterns) {
        if (templateInfo.prompt.match(pattern)) {
          hasWordCount = true;
          break;
        }
      }
      
      if (!hasWordCount) {
        const wordCount = templateInfo.word_count || 1000;
        const minWord = Math.floor(wordCount * 0.95);
        const maxWord = Math.ceil(wordCount * 1.05);
        systemPrompt += `\n\n【重要提醒】字数必须严格控制在${minWord}-${maxWord}字之间，这是最高优先级！`;
      }
    } else if (templateInfo) {
      const personaInfo = templateInfo.personality || '';
      const personaSupplement = templateInfo.persona_supplement || '';
      const authorName = templateInfo.author_name || '';
      const field = templateInfo.field || '';
      const targetAudience = templateInfo.target_audience || '';
      const wordCount = templateInfo.word_count || 1000;
      const minWord = Math.floor(wordCount * 0.95);
      const maxWord = Math.ceil(wordCount * 1.05);
      
      systemPrompt = `你是一位专业的公众号文章写作专家。
${authorName ? `\n【作者姓名】${authorName}` : ''}
${personaInfo ? `\n【人物性格】${personaInfo}` : ''}
${personaSupplement ? `\n【人设补充】${personaSupplement}` : ''}
${field ? `\n【文章领域】${field}` : ''}
${targetAudience ? `\n【目标受众】${targetAudience}` : ''}
【字数要求】${minWord}-${maxWord}字（严格控制）`;
    } else {
      systemPrompt = prompt || `你是一位专业的公众号文章写作专家，擅长创作1000字左右的爆款文章。

【核心要求】字数必须严格控制在950-1050字之间，这是最高优先级！

字数计算方法：只计算中文文字、标点和emoji，忽略Markdown符号(#*_等)

写作结构（严格按此结构）：
- 标题（# 开头）：用问句或痛点吸引眼球
- 开头（1段，约80-100字）：用故事或反问引发共鸣
- 核心段落（2-3段，每段约120-150字）：用 ## 标题分隔，每个段落3-4句话
- 总结（1段，约80-100字）：用升华或行动号召结尾

【禁止】
- 绝不能超过1100字
- 不要写5个以上段落
- 不要使用过多emoji（每篇最多3-5个）

【排版要求】
- 使用 ## 二级标题（最多2-3个）
- 使用 > 引用块突出1-2个重点
- 使用 --- 分隔线（最多1次）
- 使用 - 无序列表列举要点

请严格按以上要求创作，确保字数精准！`;
    }

    // 添加投喂素材信息
    const materialContext = enableMaterial && (materialLinks || materialRequirements) ? `
## 投喂参考素材
${materialLinks ? `### 参考素材链接
${materialLinks}` : ''}
${materialRequirements ? `### 创作要求/大纲/观点素材
${materialRequirements}` : ''}

---` : '';
    
    const wordCountReq = '950-1050字（绝不超过1100字）';
    
    const userContent = searchContext || materialContext
      ? `# 任务：创作一篇约1000字的公众号文章

## 标题
${title || '（由AI根据素材自动生成爆款标题）'}

${searchContext || ''}
${materialContext}

## 【严格字数要求】${wordCountReq}
- 开头：约80-100字（故事或提问）
- 核心段落：2-3段，每段约120-150字
- 总结：约80-100字
- **总字数必须控制在950-1050字之间！**

## 【结构要求】
- 开头1段 → 核心2-3段 → 总结1段
- 共4-5个段落
- 每个段落3-4句话

## 【排版要求】
- 使用 ## 二级标题（最多2-3个）
- 使用 > 引用块（1-2个）
- 使用 --- 分隔线（最多1次）
- emoji最多3-5个 💡🔥✨

## 【禁止】
- 超过1100字
- 超过5个段落
- 过多emoji

---
**完成后请统计字数，确保在950-1050字之间！**`
      : `# 任务：创作一篇约1000字的公众号文章

## 标题
${title || '（由AI自动生成爆款标题）'}

## 【严格字数要求】${wordCountReq}
- 开头：约80-100字（故事或提问）
- 核心段落：2-3段，每段约120-150字
- 总结：约80-100字
- **总字数必须控制在950-1050字之间！**

## 【结构要求】
- 开头1段 → 核心2-3段 → 总结1段
- 共4-5个段落
- 每个段落3-4句话

## 【排版要求】
- 使用 ## 二级标题（最多2-3个）
- 使用 > 引用块（1-2个）
- 使用 --- 分隔线（最多1次）
- emoji最多3-5个 💡🔥✨

## 【禁止】
- 超过1100字
- 超过5个段落
- 过多emoji

---
**完成后请统计字数，确保在950-1050字之间！**`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userContent },
    ];

    // 步骤1: 生成文章文本
    let articleContent = '';
    console.log('开始生成文章...');
    
    try {
      const stream = llmClient.stream(messages, {
        model: 'deepseek-v3-2-251201',
        temperature: 0.8,
        streaming: false,
      });

      for await (const chunk of stream) {
        if (chunk.content) {
          articleContent += chunk.content.toString();
        }
      }
      console.log('文章生成完成，长度:', articleContent.length);
    } catch (error) {
      console.error('生成文章失败:', error);
      return Response.json(
        { error: '生成文章失败，请稍后重试' },
        { status: 500 }
      );
    }

    if (!articleContent.trim()) {
      return Response.json(
        { error: '生成文章内容为空，请重试' },
        { status: 500 }
      );
    }

    // 步骤2: 生成图片（如果启用且数量 > 0）
    let images: { url: string; prompt: string; position?: number }[] = [];
    
    if (imageSource === 'ai' && imageCount > 0) {
      console.log(`开始生成 ${imageCount} 张图片...`);
      
      try {
        // 根据文章内容生成图片提示词
        const imagePromptMessages = [
          { 
            role: 'system' as const, 
            content: '你是一个专业的图片描述专家，根据文章内容生成适合的图片描述。描述要具体、生动，适合AI绘图使用。' 
          },
          { 
            role: 'user' as const, 
            content: `根据以下文章内容，生成${imageCount}个不同的图片描述（每个描述50-100字），用于为文章配图。\n\n要求：\n1. 每个描述要对应文章的不同段落或主题\n2. 描述要具体、有画面感\n3. 不要使用人脸特写，优先使用场景、物品、概念图\n4. 风格：温暖、真实、生活化\n5. 格式：直接输出描述文字，每行一个，用序号分隔\n\n文章内容：\n${articleContent.substring(0, 2000)}` 
          },
        ];

        const imagePromptStream = llmClient.stream(imagePromptMessages, {
          model: 'deepseek-v3-2-251201',
          temperature: 0.7,
          streaming: false,
        });

        let imagePromptText = '';
        for await (const chunk of imagePromptStream) {
          if (chunk.content) {
            imagePromptText += chunk.content.toString();
          }
        }

        // 解析图片提示词
        const promptLines = imagePromptText
          .split('\n')
          .filter(line => line.trim())
          .slice(0, imageCount)
          .map(line => line.replace(/^\d+[.、:：]\s*/, '').trim());

        // 生成每张图片
        for (let i = 0; i < promptLines.length; i++) {
          const prompt = promptLines[i] || `文章配图，${title || '相关主题'}`;
          console.log(`生成图片 ${i + 1}: ${prompt.substring(0, 50)}...`);
          
          try {
            const imageResult = await imageClient.generate({
              prompt: prompt,
              size: '2K',
              watermark: false,
              responseFormat: 'url',
            });

            if (imageResult.data && imageResult.data.length > 0) {
              const imageData = imageResult.data[0];
              if (imageData.url) {
                images.push({
                  url: imageData.url,
                  prompt: prompt,
                  position: i + 1,
                });
                console.log(`图片 ${i + 1} 生成成功`);
              }
            }
          } catch (imgError) {
            console.error(`图片 ${i + 1} 生成失败:`, imgError);
          }
        }
      } catch (error) {
        console.error('图片生成过程出错:', error);
        // 图片生成失败不影响文章返回
      }
    }

    console.log(`生成完成：文章 ${articleContent.length} 字，图片 ${images.length} 张`);

    return Response.json({
      success: true,
      content: articleContent,
      images: images,
      imageCount: images.length,
      message: images.length > 0 
        ? `文章生成完成，已生成 ${images.length} 张配图` 
        : '文章生成完成',
    });

  } catch (error) {
    console.error('生成失败:', error);
    return Response.json(
      { error: '生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
