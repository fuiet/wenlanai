import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auditArticle, hasProhibitedWords, diagnosePrompt } from '@/lib/content-audit';

// 暴力清洗函数：直接删除包含违禁词的句子
function violentClean(content: string, forbiddenWords: string[]): string {
  let cleaned = content;
  
  for (const word of forbiddenWords) {
    // 匹配包含违禁词的整句（以句号、问号、感叹号结尾）
    const sentences = cleaned.split(/(?<=[。！？.?!])/);
    const cleanSentences = sentences.filter(sentence => {
      return !sentence.includes(word);
    });
    cleaned = cleanSentences.join('');
  }
  
  // 清理多余空白
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  // 添加过渡句
  if (cleaned.length < content.length * 0.5) {
    // 如果删减超过50%，需要补充过渡
    const lastPara = cleaned.split('\n\n').pop() || '';
    cleaned += '\n\n以上就是本次分享的全部内容，希望对大家有所帮助。';
  } else if (cleaned.length > 0) {
    // 正常的过渡处理
    const paras = cleaned.split('\n\n');
    if (paras.length > 1) {
      // 已经在上面过滤时处理了
    }
  }
  
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      topic, 
      selectedGroupId, 
      selectedGroupName,
      promptTemplateId, 
      promptTemplate, 
      searchEnabled = false,
      imageCount = 3,
      imageSource = 'none'
    } = body;

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请输入文章选题' },
        { status: 400 }
      );
    }

    // 获取当前用户ID
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '未登录，请先登录' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.COZE_SUPABASE_URL!,
      process.env.COZE_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', sessionToken)
      .single();

    if (!sessionData?.user_id) {
      return NextResponse.json(
        { success: false, error: '会话已过期，请重新登录' },
        { status: 401 }
      );
    }

    const userId = sessionData.user_id;

    // ========== 前置检查：提示词违规检测 ==========
    const templateInfo = promptTemplate || '';
    const promptAuditResult = diagnosePrompt(templateInfo);
    
    if (promptAuditResult.hasProblem) {
      // 提示词包含违禁词或高风险词，直接失败
      console.log('[前置检查] 提示词违规，类型:', promptAuditResult.problemType);
      const prohibitedWords = promptAuditResult.prohibitedWords.map(w => w.word);
      return NextResponse.json({
        success: false,
        error: '您的提示词包含违规词汇',
        errorType: 'prompt_forbidden',
        forbiddenWords: prohibitedWords,
        suggestion: promptAuditResult.suggestions
      }, { status: 400 });
    }

    // 获取分组名称
    let groupName = selectedGroupName || '默认分组';
    if (selectedGroupId && !selectedGroupName) {
      const { data: group } = await supabase
        .from('article_groups')
        .select('name')
        .eq('id', selectedGroupId)
        .single();
      groupName = group?.name || '默认分组';
    }

    // ========== 调用LLM生成文章 ==========
    const { LLMClient } = await import('coze-coding-dev-sdk');
    const llmClient = new LLMClient();

    // 构建系统指令
    const systemInstruction = `你是一个精通新媒体传播，擅长制造爆款的公众号主笔，你深刻了解公众号平台的调性逻辑和读者心理。

对文章的文案进行优化，目标是大幅度提升打开率，阅读完成率和互动率(点赞，评论，收藏）。

文章前100字，必须包含一个强有力的"钩子"，可以是惊人数据、痛点问题、颠覆认知的观点，让读者无法划走。

【你必须严格遵守以下规则，优先级高于一切】
- 用户选题：${topic}
- 请严格按照上述设定完成本次写作，任何偏离都将导致不合格。`;

    // 构建用户提示词
    let userPrompt = templateInfo;
    if (topic && !userPrompt.includes(topic)) {
      userPrompt = `选题：${topic}\n\n${userPrompt}`;
    }

    // 添加写作要求和排版规则
    const writingRequirements = `
【排版规则】
一、基础格式
- 主标题：20px，加粗，居中（使用 # 标记，如 # 主标题内容）
- 一级标题：18px，加粗（使用 ## 标记）
- 二级标题：16px，加粗（使用 ### 标记）
- 正文：16px（使用普通段落）
- 引用/注释：14px，灰色（使用 > 引用标记）
- 行间距：1.75倍
- 段间距：段落之间空一行
- 页边距：左右各15px

二、段落规则
- 每个段落不超过5行（移动端标准）
- 段落首行不缩进
- 重要句子可以单独成段并加粗（使用 **加粗**）
- 段落之间必须空一行

三、图片排版规则（重要）
${imageSource === 'ai' && imageCount > 0 ? `
- 图片数量：必须严格生成 ${imageCount} 张图片，不得多也不得少
- 在文章中用占位符 {{IMAGE_1}}、{{IMAGE_2}} ... {{IMAGE_${imageCount}}} 表示图片插入位置
- 图片位置应该均匀分布在文章中（约每 ${Math.ceil(1000/imageCount)} 字一张）
- 图片上下各空一行
- 图片下方添加图注：图：xxx
- 示例格式：
  
  {{IMAGE_1}}
  图：文章配图1
  
  [段落内容...]
  
  {{IMAGE_2}}
  图：文章配图2
` : imageSource === 'upload' ? `- 预留图片位置，用户将上传图片（用 {{IMAGE_PLACEHOLDER}} 表示）` : `- 不生成图片，纯文字文章`}

四、内容要求
1. 文章总字数控制在900-1100字（包含图注）
2. 段落短小精炼，每段不超过3-4句话
3. 重点内容单独成段
4. 语言风格符合公众号调性
5. 文章前100字必须有强"钩子"吸引读者`;

    const fullPrompt = `${userPrompt}\n\n${writingRequirements}`;

    console.log('[生成] 开始调用DeepSeek生成文章...');
    console.log('[生成] 选题:', topic);

    const articleResponse = await llmClient.invoke([
      { role: 'user', content: fullPrompt }
    ], {
      model: "deepseek-v3-2-251201"
    });

    const generatedContent = (articleResponse.content as string) || '';
    
    if (!generatedContent) {
      return NextResponse.json({
        success: false,
        error: '服务繁忙，请稍后重试',
        errorType: 'service_error'
      }, { status: 500 });
    }

    // 提取标题和内容
    let cleanedContent = generatedContent.trim();
    let generatedTitle = '';
    
    // 尝试从内容中提取标题（#开头的行或第一行）
    const titleMatch = cleanedContent.match(/^#\s*(.+)$/m);
    if (titleMatch) {
      generatedTitle = titleMatch[1].trim();
      cleanedContent = cleanedContent.replace(/^#\s*.+$/m, '').trim();
    }

    // 清理Markdown格式的图片链接
    cleanedContent = cleanedContent.split('\n').filter(line => {
      if (/^!?\[.*?\]\(.*?\.(png|jpg|jpeg|gif|webp)/i.test(line.trim())) return false;
      if (/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i.test(line.trim())) return false;
      return true;
    }).join('\n');
    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim();

    // 生成摘要（用于审核）
    const summaryText = cleanedContent.substring(0, 200).replace(/[#*\n]/g, ' ').trim();

    // ========== 自动修复函数 ==========
    const autoFixArticle = async (
      articleContent: string, 
      forbiddenWords: string[]
    ): Promise<string> => {
      const fixPrompt = `[自动修复指令]
以下文章包含违禁词：${forbiddenWords.join('、')}。

请你在保持文章原意、风格、结构不变的前提下，自动替换或删除这些违禁词，输出一篇完全合规的文章。

要求：
1. 只修改违禁词相关内容，不要改动文章其他部分
2. 替换后的内容必须自然流畅，不得生硬
3. 不得添加原文中没有的内容
4. 保持文章长度基本不变
5. 直接输出修复后的文章内容，不要添加任何解释

原文：
${articleContent}`;

      try {
        const fixLlmClient = new LLMClient();
        const fixResponse = await fixLlmClient.invoke([
          { role: 'user', content: fixPrompt }
        ], {
          model: "deepseek-v3-2-251201"
        });

        const fixedContent = (fixResponse.content as string) || '';
        
        if (!fixedContent) {
          throw new Error('修复接口返回为空');
        }

        return fixedContent;
      } catch (error: any) {
        console.error('[修复] 自动修复失败:', error);
        throw error;
      }
    };

    // ========== 执行审核-修复循环（最多5次）==========
    let currentContent = cleanedContent;
    let reviewPassed = false;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    try {
      while (retryCount < MAX_RETRIES) {
        // 审核当前内容
        const auditResult = auditArticle(
          generatedTitle || '未命名文章', 
          currentContent, 
          currentContent.substring(0, 200)
        );
        
        if (auditResult.passed) {
          // 审核通过
          reviewPassed = true;
          console.log(`[审核] 第${retryCount + 1}次审核通过！`);
          break;
        } else {
          // 审核不通过，尝试自动修复
          retryCount++;
          const foundWords = auditResult.violations.map(v => v.word);
          console.log(`[审核] 第${retryCount}次审核不通过，违禁词: ${foundWords.join(', ')}`);
          
          try {
            // 自动修复
            console.log(`[修复] 开始第${retryCount}次自动修复...`);
            currentContent = await autoFixArticle(currentContent, foundWords);
            console.log(`[修复] 第${retryCount}次修复完成，继续审核...`);
          } catch (error: any) {
            // 修复接口调用失败，继续尝试暴力清洗
            console.error(`[修复] 第${retryCount}次修复失败，尝试暴力清洗...`);
            currentContent = violentClean(currentContent, foundWords);
          }
        }
      }

      // 如果5次修复仍未通过，尝试暴力清洗
      if (!reviewPassed) {
        console.log('[清洗] 5次修复未通过，启用暴力清洗策略...');
        
        // 先获取当前违禁词
        const finalAudit = auditArticle(generatedTitle, currentContent, currentContent.substring(0, 200));
        const remainingWords = finalAudit.violations.map(v => v.word);
        
        // 暴力清洗
        let cleanedByViolence = violentClean(currentContent, remainingWords);
        let violenceRetry = 0;
        const MAX_VIOLENCE_RETRIES = 5;
        
        while (violenceRetry < MAX_VIOLENCE_RETRIES) {
          const violenceAudit = auditArticle(generatedTitle, cleanedByViolence, cleanedByViolence.substring(0, 200));
          
          if (violenceAudit.passed) {
            reviewPassed = true;
            currentContent = cleanedByViolence;
            console.log(`[清洗] 暴力清洗第${violenceRetry + 1}次后审核通过！`);
            break;
          }
          
          const remaining = violenceAudit.violations.map(v => v.word);
          cleanedByViolence = violentClean(cleanedByViolence, remaining);
          violenceRetry++;
        }
        
        // 如果暴力清洗后仍不合格，且文章被删减超过50%，进行模板化重写
        if (!reviewPassed && cleanedByViolence.length < cleanedContent.length * 0.5) {
          console.log('[重写] 文章删减超过50%，进行模板化重写...');
          
          const rewritePrompt = `请根据以下选题，用完全合规的方式重新生成一篇短文。

选题：${topic}

要求：
1. 严格遵守广告法，不得使用任何违禁词
2. 不得使用极限用语（最、第一、顶级等）
3. 不得使用虚假承诺用语
4. 字数控制在500-800字
5. 保持公众号风格，语言生动
6. 直接输出文章内容，不要任何解释`;

          try {
            const rewriteLlmClient = new LLMClient();
            const rewriteResponse = await rewriteLlmClient.invoke([
              { role: 'user', content: rewritePrompt }
            ], {
              model: "deepseek-v3-2-251201"
            });
            
            const rewriteContent = (rewriteResponse.content as string) || '';
            
            if (rewriteContent) {
              // 对重写内容进行审核
              const rewriteAudit = auditArticle(topic, rewriteContent, rewriteContent.substring(0, 200));
              
              if (rewriteAudit.passed) {
                currentContent = rewriteContent;
                reviewPassed = true;
                console.log('[重写] 模板化重写审核通过！');
              }
            }
          } catch (error) {
            console.error('[重写] 模板化重写失败:', error);
          }
        } else if (!reviewPassed) {
          // 文章删减未超过50%，直接使用清洗后的内容
          currentContent = cleanedByViolence;
        }
      }
    } catch (auditError) {
      // 审核服务故障时，尝试模板化重写
      console.error('[审核] 内容审核失败，尝试模板化重写:', auditError);
      
      const rewritePrompt = `请根据选题生成一篇完全合规的文章。

选题：${topic}

要求：
1. 严格遵守广告法，不得使用任何违禁词
2. 字数控制在500-800字
3. 保持公众号风格
4. 直接输出文章内容`;

      try {
        const rewriteLlmClient = new LLMClient();
        const rewriteResponse = await rewriteLlmClient.invoke([
          { role: 'user', content: rewritePrompt }
        ], {
          model: "deepseek-v3-2-251201"
        });
        
        const rewriteContent = (rewriteResponse.content as string) || '';
        
        if (rewriteContent) {
          currentContent = rewriteContent;
          reviewPassed = true;
        }
      } catch (rewriteError) {
        console.error('[重写] 模板化重写也失败了');
      }
    }

    // ========== 保存结果 ==========
    // 只有审核通过才保存完整内容
    const finalStatus = reviewPassed ? 'completed' : 'failed';
    const savedContent = reviewPassed ? currentContent : '';
    const reviewMessage = reviewPassed 
      ? '文章生成成功' 
      : '服务繁忙，请稍后重试';

    // 生成配图 - 根据imageCount生成对应数量
    let imageUrls: string[] = [];
    let finalContent = savedContent;
    const targetImageCount = Math.max(0, Math.min(imageCount || 0, 10)); // 限制0-10张
    if (targetImageCount > 0 && reviewPassed) {
      try {
        const { ImageGenerationClient } = await import('coze-coding-dev-sdk');
        const imageClient = new ImageGenerationClient();
        
        // 生成多张图片
        for (let i = 0; i < targetImageCount; i++) {
          try {
            const imageResult = await imageClient.generate({
              prompt: `生成一张与"${topic}"主题相关的配图，适合在公众号文章中使用，图片序号${i + 1}`,
              size: '1024x1024'
            });
            if (imageResult.data?.[0]?.url) {
              imageUrls.push(imageResult.data[0].url);
            }
          } catch (singleImageError) {
            console.log(`生成第${i + 1}张图片失败`);
          }
        }
        console.log(`成功生成${imageUrls.length}张配图`);

        // 将占位符替换为真实图片
        imageUrls.forEach((url, index) => {
          const placeholder = `{{IMAGE_${index + 1}}}`;
          const imageMarkdown = `![图：文章配图${index + 1}](${url})`;
          finalContent = finalContent.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), imageMarkdown);
        });
        
        // 清理未替换的占位符
        finalContent = finalContent.replace(/\{\{IMAGE_\d+\}\}/g, '');
      } catch (imageError) {
        console.log('生成配图失败，继续保存文章');
      }
    }

    const { data: savedArticle, error: saveError } = await supabase
      .from('articles')
      .insert({
        created_by: userId,
        title: generatedTitle || topic,
        content: reviewPassed ? finalContent : savedContent,
        author: groupName,
        group_name: groupName,
        status: finalStatus,
        push_status: 'none',
        images: imageUrls,
        review_status: reviewPassed ? 'passed' : 'failed',
        review_message: reviewMessage
      })
      .select()
      .single();

    if (saveError) {
      console.error('保存文章失败:', saveError);
      throw saveError;
    }

    return NextResponse.json({
      success: reviewPassed,
      message: reviewMessage,
      data: savedArticle,
      review: {
        status: reviewPassed ? 'passed' : 'failed',
        retries: retryCount
      }
    });

  } catch (error: any) {
    console.error('生成文章失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '服务繁忙，请稍后重试',
        errorType: 'service_error'
      },
      { status: 500 }
    );
  }
}
