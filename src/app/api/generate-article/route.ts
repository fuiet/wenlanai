import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { typographyEngine } from '@/lib/typography-engine';

// ========== 安全创作机制 ==========

// 一级违规词（涉政、色情、暴力等）- 发现直接删除句子
const level1ForbiddenPatterns = [
  /涉及[政党政权领导人敏感]*(?:敏感内容|违规)/gi,
  /(?:色情|低俗|涉黄)[内容描写]*/gi,
  /(?:暴力|恐怖|血腥)[内容场景]*/gi,
  /(?:赌博|博彩|彩票)[网站平台玩法]*/gi,
  /(?:毒品|吸毒|贩毒)/gi,
  /(?:诈骗|骗子|骗局)/gi,
  /不转不是中国人/gi,
  /转发后[一人生平安]/gi,
  /转疯了/gi,
  /银行卡号[:：]?\s*[\dX]+/gi,
  /支付宝账号[:：]?\s*[\w@.]+/gi,
  /汇款指令/gi,
];

// 广告极限词 - 替换为安全表达
const extremeWordReplacements: Record<string, string> = {
  '国家级': '高品质',
  '最高级': '高品质',
  '最佳': '优质',
  '第一品牌': '知名品牌',
  '顶级': '高端',
  '极品': '优质',
  '唯一': '独到',
  '全网第一': '广受欢迎',
  '全国第一': '行业领先',
  '最好': '值得推荐',
  '最棒': '很棒',
  '最优秀': '优秀',
  '最便宜': '实惠',
  '最超值': '超值',
  '最好用': '好用',
  '最实用': '实用',
};

// 诱导分享句式 - 直接删除
const shareInducingPatterns = [
  /不转不是中国人[，。！]/gi,
  /转发后一生平安[，。！]/gi,
  /转疯了[，。！]/gi,
  /赶紧转发[吧呀]?/gi,
  /转发即送/gi,
  /转发分享/gi,
  /群发[好友朋友]/gi,
];

/**
 * 安全扫描：快速检查并处理违规内容
 */
function safeScan(content: string): { cleaned: string; foundIssues: string[] } {
  let cleaned = content;
  const foundIssues: string[] = [];

  // 1. 检测一级违规词
  for (const pattern of level1ForbiddenPatterns) {
    const matches = cleaned.match(pattern);
    if (matches) {
      foundIssues.push(...matches);
      // 删除包含违规词的整个句子
      cleaned = cleaned.split(/[。！？.!?]/).filter(sentence => {
        for (const match of matches) {
          if (sentence.includes(match)) return false;
        }
        return true;
      }).join('。');
    }
  }

  // 2. 替换广告极限词
  for (const [word, replacement] of Object.entries(extremeWordReplacements)) {
    const regex = new RegExp(word, 'gi');
    if (regex.test(cleaned)) {
      foundIssues.push(word);
      cleaned = cleaned.replace(regex, replacement);
    }
  }

  // 3. 删除诱导分享句式
  for (const pattern of shareInducingPatterns) {
    const matches = cleaned.match(pattern);
    if (matches) {
      foundIssues.push(...matches.map(m => `[诱导分享]${m}`));
      cleaned = cleaned.replace(pattern, '');
    }
  }

  // 清理多余空白
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // 如果内容被删减太多，添加安全结语
  if (cleaned.length < 100 && content.length > 200) {
    cleaned = `感谢阅读，以上是关于"${content.match(/[#\u4e00-\u9fa5]{2,10}/)?.[0] || '本话题'}"的分享，希望对您有所帮助。`;
  }

  return { cleaned, foundIssues };
}

// ========== 主逻辑 ==========

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

    // 构建系统指令（包含安全创作规则）
    const systemInstruction = `你是一个精通新媒体传播，擅长制造爆款的公众号主笔，你深刻了解公众号平台的调性逻辑和读者心理。

对文章的文案进行优化，目标是大幅度提升打开率，阅读完成率和互动率(点赞，评论，收藏）。

文章前100字，必须包含一个强有力的"钩子"，可以是惊人数据、痛点问题、颠覆认知的观点，让读者无法划走。

【安全红线 - 绝对禁止】
1. 绝对禁止生成以下内容：
   - 涉政敏感话题
   - 色情低俗描写
   - 暴力恐怖内容
   - 赌博、毒品、诈骗相关的任何描述
   - 诱导分享的话术（如"不转不是中国人"、"转发后一生平安"、"转疯了"）
   - 银行卡号、支付宝账号、汇款指令等金融操作信息

2. 禁止使用广告极限词做主观吹嘘：
   - 禁用：国家级、最高级、最佳、第一品牌、顶级、极品、唯一、全网第一、全国第一
   - 客观陈述可以用"最"（如"世界上最高的山峰"），但不用"最"做主观吹嘘
   - 不确定时，换一种说法（如"最好"改为"值得推荐"）

【你必须严格遵守以下规则】
- 用户选题：${topic}
- 请严格按照上述设定完成本次写作，任何偏离都将导致不合格。
- 禁止在正文中输出任何代码符号：<、>、{、}、style=、class= 等
- 只输出纯文本内容，不要输出任何HTML、CSS或代码片段

【输出要求】
- 只输出纯文章内容，禁止使用任何Markdown符号（#、##、> 等）
- 禁止输出任何HTML标签
- 不要输出任何代码标签或格式标记

    // 构建用户提示词
    let userPrompt = promptTemplate || '';
    if (topic && !userPrompt.includes(topic)) {
      userPrompt = `选题：${topic}\n\n${userPrompt}`;
    }

    // 添加写作要求和排版规则
    const writingRequirements = `
【排版规则】
一、基础格式
- 主标题：加粗，居中（不使用任何格式符号，直接输出标题文字）
- 一级标题：加粗（不使用任何格式符号）
- 二级标题：加粗（不使用任何格式符号）
- 正文：普通段落
- 引用/注释：普通段落，不使用任何标记
- 行间距：1.75倍
- 段间距：段落之间空一行
- 页边距：左右各15px

二、段落规则
- 每个段落不超过30个字
- 段落首行不缩进
- 重要句子可以单独成段并加粗（使用 **加粗**）
- 段落之间必须空一行

三、图片排版规则（重要）
${imageSource === 'ai' && imageCount > 0 ? `
- 图片数量：必须严格生成 ${imageCount} 张图片，不得多也不得少
- 在文章中用占位符 {{IMAGE_1}}、{{IMAGE_2}} ... {{IMAGE_${imageCount}}} 表示图片插入位置
- 图片位置应该均匀分布在文章中（约每 ${Math.ceil(1000/imageCount)} 字一张）
- 图片占位符单独一行，前后各空一行
- 占位符前后不要添加任何文字说明（如"配图"、"图1"、"图2"等）
- 示例格式：
  
  {{IMAGE_1}}
  
  [段落内容...]
  
  {{IMAGE_2}}
  
  [段落内容...]
` : imageSource === 'upload' ? `- 预留图片位置，用户将上传图片（用 {{IMAGE_PLACEHOLDER}} 表示）` : `- 不生成图片，纯文字文章`}

四、内容要求
1. 文章总字数控制在900-1100字
2. 段落短小精炼，每段不超过3-4句话
3. 重点内容单独成段
4. 语言风格符合公众号调性
5. 文章前100字必须有强"钩子"吸引读者
6. 不要在文章中添加"配图"、"图1"、"图2"、"图3"等文字说明
7. 文章结尾不要添加"完"、"END"、"本文完"、"谢谢阅读"等任何结束语`;

    const fullPrompt = `${userPrompt}\n\n${writingRequirements}`;

    console.log('[生成] 开始调用DeepSeek生成文章...');
    console.log('[生成] 选题:', topic);

    const articleResponse = await llmClient.invoke([
      { role: 'user', content: fullPrompt }
    ], {
      model: "deepseek-v3-2-251201",
      temperature: 0.3  // 低温度参数，提高输出稳定性
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

    // ========== 安全扫描 ==========
    console.log('[安全] 开始安全扫描...');
    const safeScanResult = safeScan(cleanedContent);
    cleanedContent = safeScanResult.cleaned;
    if (safeScanResult.foundIssues.length > 0) {
      console.log('[安全] 发现并处理了以下问题:', safeScanResult.foundIssues);
    } else {
      console.log('[安全] 安全扫描通过，无违规内容');
    }
    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim();

    // ========== 原子化随机排版引擎 ==========
    // 排版引擎执行：段落拆分 + 序列词处理 + 14维随机样式
    console.log('[排版] 开始原子化随机排版...');
    let finalContent = cleanedContent;
    let typographyResult = null;
    
    try {
      typographyResult = typographyEngine(cleanedContent, '#1890ff');
      finalContent = typographyResult.content;
      console.log('[排版] 原子化随机排版完成');
      console.log('[排版] 维度组合:', JSON.stringify(typographyResult.dimensions));
    } catch (typographyError) {
      console.error('[排版] 排版引擎执行失败，使用原始内容:', typographyError);
      finalContent = cleanedContent;
    }
    
    console.log('[排版] 排版处理完成，字符数:', finalContent.length);
    
    // ========== 生成配图 ==========
    let imageUrls: string[] = [];
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
              imagePrompt = `${topic}主题插画风格配图，现代简约，扁平化设计，无文字无水印`;
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
      } catch (imageError) {
        console.log('生成配图失败');
      }
    }
    
    // ========== 原子化随机排版引擎 ==========
    console.log('[排版] 开始原子化随机排版...');
    
    // 调用排版引擎（包含段落拆分规则和14个随机维度）
    const { content: formattedContent, dimensions } = typographyEngine(finalContent);
    finalContent = formattedContent;
    console.log('[排版] 随机维度:', dimensions);
    console.log('[排版] 原子化随机排版完成');

    // ========== 语法检查与修复 ==========
    console.log('[语法] 开始语法检查...');
    try {
      // 调用LLM进行语法检查和句子结构检查
      const grammarCheckPrompt = `你是一个专业的文章编辑，请对以下文章进行全面检查：

1. 检查句子完整性：是否具备"主语-谓语-宾语"结构
2. 检查断裂句：缺主语、缺宾语的句子
3. 检查不通顺结构："的"后面直接跟"的"或句号
4. 检查段落衔接：段落之间逻辑是否连贯
5. 检查整体通顺度

文章内容：
${finalContent}

请输出：
- 如果文章完全通顺：输出"[语法检查通过]"
- 如果有问题：输出"[语法问题]" + 具体问题描述

问题格式：
- 问题句子：[具体句子]
- 问题类型：[缺主语/缺宾语/断裂句/不通顺/衔接不畅]
- 位置：第X段

请仔细检查，不要漏掉任何问题。`;

      const grammarCheckResult = await llmClient.chat({
        model: 'deepseek-v3-2-251201',
        messages: [{ role: 'user', content: grammarCheckPrompt }],
        temperature: 0.1
      });

      const grammarFeedback = grammarCheckResult.choices?.[0]?.message?.content || '';

      // 如果发现问题，进行修复
      if (grammarFeedback.includes('[语法问题]')) {
        console.log('[语法] 发现语法问题，进行自动修复...');

        const fixPrompt = `你是一个专业的新媒体编辑，以下是一篇文章存在语法问题，请根据反馈进行修复。

原文：
${finalContent}

问题反馈：
${grammarFeedback}

修复要求：
1. 修复断裂句：补全缺损的主语、谓语或宾语
2. 修复不通顺结构："的"后面跟"的"或句号等
3. 删除无法修复的完全断裂句
4. 合并碎片句：少于5个字的短句与前一句合并
5. 确保段落之间逻辑衔接自然
6. 不要添加或删除实质性内容
7. 保持原有格式和标题结构
8. 确保每个完整句子都有主语和谓语

请直接输出修复后的完整文章，不要添加任何说明。`;

        const fixResult = await llmClient.chat({
          model: 'deepseek-v3-2-251201',
          messages: [{ role: 'user', content: fixPrompt }]
        });

        const fixedContent = fixResult.choices?.[0]?.message?.content || '';

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

    // ========== 强制图片插入 ==========
    // HTML过滤和段落拆分完成后，最后插入图片
    if (imageUrls && imageUrls.length > 0) {
      console.log(`[图片] 开始插入${imageUrls.length}张图片...`);
      try {
        // 提取文章段落
        const paragraphs = finalContent.split(/\n\n+/).filter(p => p.trim().length > 10);
        
        // 在关键段落位置插入图片
        const insertPositions = [];
        if (paragraphs.length > 0) {
          // 计算图片插入位置（平均分布）
          const gap = Math.max(1, Math.floor(paragraphs.length / (imageUrls.length + 1)));
          for (let i = 1; i <= imageUrls.length; i++) {
            insertPositions.push(Math.min(i * gap, paragraphs.length - 1));
          }
        }
        
        // 生成图片描述，确保每张图片内容不同且与文章相关
        const imageDescs = imageUrls.map((url, index) => {
          const relatedPara = paragraphs[insertPositions[index]] || paragraphs[0] || '';
          const relatedText = relatedPara.replace(/[*#\n]/g, '').substring(0, 50);
          return `配图：${relatedText}`;
        });
        
        // 替换占位符或插入图片
        imageUrls.forEach((url, index) => {
          const placeholder = `{{IMAGE_${index + 1}}}`;
          const imageHtml = `<img src="${url}" alt="" style="width:100%;margin:15px 0" />`;
          
          if (finalContent.includes(placeholder)) {
            finalContent = finalContent.replace(placeholder, imageHtml);
          }
        });
        
        console.log(`[图片] 插入完成`);
      } catch (imageError) {
        console.log('[图片] 插入图片时出错:', imageError);
      }
    }

    // ========== 最终清理：确保无乱码 ==========
    console.log('[清理] 执行最终清理...');
    
    // 清理所有可能的图注和图片描述文字
    finalContent = finalContent
      // 清理各种图注格式
      .replace(/（[^）]*图[^）]*）/g, '')  // （图片描述）
      .replace(/\([^)]*图[^)]*\)/g, '')    // (图片描述)
      .replace(/图\d+[：:：]?\s*/g, '')      // 图1：、图2：
      .replace(/图[：:：]\s*/g, '')           // 图：
      .replace(/配图\d+/g, '')               // 配图1
      .replace(/图片序号\d+/g, '')           // 图片序号1
      .replace(/图序[^，。\n]*/g, '')        // 图序1
      .replace(/图[^，。\n\d]{1,10}/g, '')   // 图+文字
      // 清理连续空行
      .replace(/\n{3,}/g, '\n\n')
      // 清理行首行尾空白
      .replace(/^\s+|\s+$/gm, '')
      // 清理残留的代码符号
      .replace(/[<>{}]/g, '')
      // 清理乱码装饰符号
      .replace(/[✦✧◆◇○●◉◐◑▪▫■□▲△▼▽▎▍▌▂▃▅▆▇▶▷◀◁━━━┅┆┇┊┋]+/g, '')
      // 清理连续标点
      .replace(/[，。、；：]{3,}/g, '，');

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
      } : null,
      safety: {
        scanned: true,
        issuesFound: safeScanResult.foundIssues.length,
        issues: safeScanResult.foundIssues
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
