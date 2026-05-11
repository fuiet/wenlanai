import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { typographyEngine } from '@/lib/typography-engine';

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
    let userPrompt = promptTemplate || '';
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

    // ========== 原子化随机排版 ==========
    let finalContent = cleanedContent;
    let typographyResult = null;
    
    try {
      // 生成随机排版
      typographyResult = typographyEngine(cleanedContent, '#1890ff');
      finalContent = typographyResult.content;
      console.log('[排版] 原子化随机排版完成');
      console.log('[排版] 维度组合:', JSON.stringify(typographyResult.dimensions));
    } catch (typographyError) {
      console.error('[排版] 排版引擎执行失败，使用原始内容:', typographyError);
      finalContent = cleanedContent;
    }

    // ========== 生成配图 ==========
    let imageUrls: string[] = [];
    const targetImageCount = Math.max(0, Math.min(imageCount || 0, 10)); // 限制0-10张
    if (targetImageCount > 0) {
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

    return NextResponse.json({
      success: true,
      message: '文章生成成功',
      data: savedArticle,
      typography: typographyResult ? {
        dimensions: typographyResult.dimensions,
        rules: typographyResult.rules
      } : null
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
