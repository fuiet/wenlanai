import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库服务暂不可用' }, { status: 503 });
    }
    
    const body = await request.json();
    
    // TODO: 实现文章生成逻辑
    return NextResponse.json({ success: true, message: '文章生成功能待实现' });
    
    try {
      // 生成随机排版 - 简洁留白风格
      typographyResult = typographyEngine(cleanedContent, { themeColor: '#1890ff' });
      finalContent = typographyResult.content;
      console.log('[排版] 简洁留白排版完成');
      console.log('[排版] 段落数:', typographyResult.stats.paragraphCount);
    } catch (typographyError) {
      console.error('[排版] 排版引擎执行失败，使用原始内容:', typographyError);
      finalContent = cleanedContent;
    }

    // ========== 生成配图 ==========
    const imageUrls: string[] = [];
    const targetImageCount = Math.max(0, Math.min(imageCount || 0, 10)); // 限制0-10张
    if (targetImageCount > 0) {
      try {
        const { ImageGenerationClient } = await import('coze-coding-dev-sdk');
        const imageClient = new ImageGenerationClient();
        
        // 根据文章内容生成关联图片
        // 1. 提取文章关键段落作为图片内容参考
        const paragraphs = finalContent.split(/\n+/).filter(p => p.trim().length > 20);
        const keyParagraphs = paragraphs.slice(0, Math.min(targetImageCount, paragraphs.length));
        
        for (let i = 0; i < targetImageCount; i++) {
          try {
            // 根据文章内容和位置生成关联图片
            let imagePrompt = '';
            
            if (i < keyParagraphs.length) {
              // 提取该位置对应的段落，去除HTML标签和特殊字符
              const relatedText = keyParagraphs[i]
                .replace(/<[^>]+>/g, '')
                .replace(/[#*_`]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 100);
              
              // 根据文章内容生成描述性图片
              imagePrompt = `插画风格配图，${relatedText}，现代简约，扁平化设计，无文字无水印，适合公众号文章`;
            } else {
              // 用文章主题生成图片
              imagePrompt = `${effectiveTopic}主题插画风格配图，现代简约，扁平化设计，无文字无水印`;
            }
            
            const imageResult = await imageClient.generate({
              prompt: imagePrompt,
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

        // 将占位符替换为真实图片（不添加任何图注文字）
        imageUrls.forEach((url, index) => {
          const placeholder = `{{IMAGE_${index + 1}}}`;
          // 直接用HTML格式插入图片，alt属性为空避免任何文字显示
          const imageHtml = `<img src="${url}" alt="" style="width:100%;margin:15px 0" />`;
          finalContent = finalContent.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), imageHtml);
        });
        
        // 清理所有可能的乱码和图注文字
        finalContent = finalContent.replace(/\{\{IMAGE_\d+\}\}/g, '');
        finalContent = finalContent.replace(/图：[^<\n]+/g, '');
        finalContent = finalContent.replace(/图\d+[：:]/g, '');
        finalContent = finalContent.replace(/配图\d+/g, '');
        // 清理所有图注/乱码文字（严格清理）
        finalContent = finalContent
          .replace(/图1[：:：]?/g, '')
          .replace(/图2[：:：]?/g, '')
          .replace(/图3[：:：]?/g, '')
          .replace(/图4[：:：]?/g, '')
          .replace(/图5[：:：]?/g, '')
          .replace(/图\d[：:：]?/g, '')
          .replace(/配图\d[：:：]?/g, '')
          .replace(/图序[^，,。.\n]*/g, '')
          .replace(/图片\d+/g, '')
          .replace(/序号[^\s\n]*/g, '')
        // 清理装饰符号和乱码
        finalContent = finalContent
          .replace(/[✦✧◆◇○●◉◐◑▪▫■□▲△▼▽▎▍▌▂▃▅▆▇▶▷◀◁━━━┅┆┇┊┋]/g, '')
          .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s\n，。、！？；：""''（）【】《》—…·.,!?;:'"()\[\]<>——]/g, '');
        finalContent = finalContent.replace(/\n{3,}/g, '\n\n');
      } catch (imageError) {
        console.log('生成配图失败，继续保存文章');
      }
    }

    // ========== 语法检查与修复 ==========
    console.log('开始语法检查...');
    try {
      // 调用LLM进行语法检查
      const grammarCheckPrompt = `你是一个专业的文章编辑，请检查以下文章的语法、通顺度和语义连贯性。

检查要求：
1. 识别语义断裂、不通顺的句子
2. 检查段落之间的逻辑衔接
3. 确保文章语义连贯、可读性强

文章内容：
${finalContent.replace(/<[^>]+>/g, '')}

请输出：
- 如果文章通顺：输出"[语法检查通过]"
- 如果有问题：输出"[语法问题]" + 具体问题描述 + 修复建议

重要：只输出检查结果，不要修改文章内容。`;

      const grammarCheckResult = await llmClient.invoke([
        { role: 'user', content: grammarCheckPrompt }
      ], {
        model: 'deepseek-v3-2-251201',
        temperature: 0.1
      });

      const grammarFeedback = grammarCheckResult.content || '';

      // 如果发现问题，进行修复
      if (grammarFeedback.includes('[语法问题]')) {
        console.log('发现语法问题，进行自动修复...');

        const fixPrompt = `你是一个专业的新媒体编辑，以下是一篇文章存在语法或语义问题，请根据反馈进行修复。

原文：
${finalContent.replace(/<[^>]+>/g, '')}

问题反馈：
${grammarFeedback}

修复要求：
1. 保持文章原意和结构不变
2. 修复语义断裂和不通顺的句子
3. 确保段落之间逻辑衔接自然
4. 不要添加或删除实质性内容
5. 保持与文章主题相关
6. 保持原有格式（标题层级、段落结构）

请直接输出修复后的完整文章，不要添加任何说明。`;

        const fixResult = await llmClient.invoke([
          { role: 'user', content: fixPrompt }
        ], {
          model: 'deepseek-v3-2-251201',
          temperature: 0.1
        });

        const fixedContent = fixResult.content || '';

        // 只有修复内容有效且长度合理时才替换
        if (fixedContent && fixedContent.length > finalContent.length * 0.5) {
          // 将修复的内容重新应用HTML格式
          finalContent = finalContent.replace(/<img[^>]+>/g, '<<<IMAGE>>>');
          const textOnly = finalContent.replace(/<[^>]+>/g, '');
          finalContent = fixedContent.replace(/<<<IMAGE>>>/g, () => {
            const imgs = textOnly.match(/<img[^>]+>/g) || [];
            return imgs.shift() || '';
          });
          console.log('语法修复完成');
        }
      } else {
        console.log('语法检查通过');
      }
    } catch (grammarError) {
      console.log('语法检查异常，继续保存:', grammarError);
    }

    // ========== 保存文章 ==========
    const { data: savedArticle, error: saveError } = await supabase
      .from('articles')
      .insert({
        created_by: userId,
        title: generatedTitle || topic,
        content: finalContent,
        author: groupName,
        group_name: groupName,
        status: 'completed',
        push_status: 'none',
        images: imageUrls,
        review_status: 'passed',
        review_message: '文章生成成功'
      })
      .select()
      .single();

    if (saveError) {
      console.error('保存文章失败:', saveError);
      throw saveError;
    }

    // ========== 提取金句、SEO关键词、互动钩子 ==========
    let shareQuote: string[] = [];
    let seoKeywords: string[] = [];
    let interactionHook: string = '';

    try {
      console.log('[提取] 开始提取金句、SEO关键词和互动钩子...');

      const extractPrompt = `你是一个专业的新媒体运营专家，请从以下文章中提取三个元素：

文章标题：${generatedTitle || topic}
文章内容：
${finalContent.replace(/<[^>]+>/g, '')}

请按照以下格式输出（严格JSON格式，不要有任何其他内容）：

{
  "shareQuote": ["金句1（10-30字）", "金句2（10-30字）"],
  "seoKeywords": ["关键词1", "关键词2", "关键词3"],
  "interactionHook": "多选式提问，如：你觉得是A、B还是C？评论区聊聊。"
}

要求：
1. shareQuote：1-2句适合朋友圈分享的金句，要有传播性，10-30字
2. seoKeywords：3个文章核心关键词，用于SEO优化
3. interactionHook：必须是多选式提问，给出具体选项，禁止开放式提问`;

      const extractResult = await llmClient.invoke([
        { role: 'user', content: extractPrompt }
      ], {
        model: 'deepseek-v3-2-251201',
        temperature: 0.3
      });

      const extractContent = extractResult.content || '';

      // 解析JSON结果
      try {
        // 提取JSON部分
        const jsonMatch = extractContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          shareQuote = parsed.shareQuote || [];
          seoKeywords = parsed.seoKeywords || [];
          interactionHook = parsed.interactionHook || '';
          console.log('[提取] 金句:', shareQuote);
          console.log('[提取] SEO关键词:', seoKeywords);
          console.log('[提取] 互动钩子:', interactionHook);
        }
      } catch (parseError) {
        console.error('[提取] JSON解析失败:', parseError);
      }
    } catch (extractError) {
      console.error('[提取] 提取失败:', extractError);
    }

    return NextResponse.json({
      success: true,
      message: '文章生成成功',
      data: savedArticle,
      typography: typographyResult ? {
        config: typographyResult.config,
        stats: typographyResult.stats
      } : null,
      safety: {
        scanned: true,
        issuesFound: safeScanResult.foundIssues.length,
        issues: safeScanResult.foundIssues
      },
      extraction: {
        shareQuote,
        seoKeywords,
        interactionHook
      }
    });

  } catch (error: unknown) {
    console.error('生成文章失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error instanceof Error ? error.message : String(error)) || '服务繁忙，请稍后重试',
        errorType: 'service_error'
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('生成文章失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
