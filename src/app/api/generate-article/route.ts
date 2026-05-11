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
      title: userTitle,  // 用户输入的标题（可选）
      topic,              // 文章主题（当没有标题时作为主题，有标题时作为内容方向）
      selectedGroupId, 
      selectedGroupName,
      promptTemplateId, 
      promptTemplate, 
      searchEnabled = false,
      imageCount = 3,
      imageSource = 'none'
    } = body;

    // 验证：标题和主题至少要有一个
    const hasTitle = userTitle && userTitle.trim().length > 0;
    const hasTopic = topic && topic.trim().length > 0;
    
    if (!hasTitle && !hasTopic) {
      return NextResponse.json(
        { success: false, error: '请输入文章主题或文章标题' },
        { status: 400 }
      );
    }

    // 如果只有标题没有主题，使用标题作为主题
    const effectiveTopic = hasTopic ? topic.trim() : userTitle.trim();

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


【开篇3秒钩子 - 强制执行】
文章前100字必须满足以下任一要求：
1. 直接冲突场景："一个XX，一个XX，差距让人震惊..."
2. 痛点前置：直接戳中读者痛点
3. 反常识数据冲击："90%的人不知道..."

禁止使用："大家好，我是XXX"、"岁月如梭"、"随着时代发展..."

【结构化叙事框架 - 必须遵循比例】
1. 引入部分（占全文20%，约180-220字）：热点场景、痛点故事开头
2. 展开部分（占全文60%，约540-660字）：3-4个小模块，每个配1个案例或数据
3. 升华总结（占全文20%，约180-220字）：给出解法、建议或情绪价值

禁止机械过渡词："首先、其次、然后、最后"
可用："重点来了"、"说到这"、"其实关键在于"

【去AI味强制注入 - 每篇文章必须包含】
1. 至少2句反问句或设问句
2. 至少1-2处口语开头："说实话"、"你敢信吗"、"凭良心讲"
3. 5%-10%的句尾随机加"~"或"..."
4. 至少1段"个人经验感"描述

【你必须严格遵守以下规则】
- 用户选题：${effectiveTopic}
${hasTitle ? `- 文章标题已指定：${userTitle.trim()}，生成文章时必须使用此标题` : ''}
- 请严格按照上述设定完成本次写作，任何偏离都将导致不合格。

【社交分享金句 - 必须提取】
文章生成后，必须从文中提炼1-2句适合分享的金句：
1. 字数控制在10-30字之间
2. 要有传播性，让人看完想转发
3. 可以是触动情感、引发共鸣、或戳中痛点的句子
4. 格式示例：
   "你以为的努力，不过是别人眼中的笑话"
   "成年人的崩溃，往往只在一瞬间"

【SEO关键词埋点 - 必须执行】
从文章中自动提取3个核心关键词，并确保：
1. 关键词自然穿插在：标题、正文前200字、至少1个小标题、结尾段落
2. 关键词密度控制在2-3%（全文约1000字，每个关键词出现2-3次）
3. 避免关键词堆砌，保持文章可读性

【文末互动钩子 - 强制生成】
文章结尾必须生成一个多选式提问：
1. 格式："你觉得是A、B还是C？评论区聊聊。"
2. 禁止开放式提问（如"你怎么看？"、"你有什么想法？"）
3. 必须给出2-4个具体选项
4. 选项要与文章主题相关，引发读者思考和讨论`;

    // 构建用户提示词
    let userPrompt = promptTemplate || '';
    if (effectiveTopic && !userPrompt.includes(effectiveTopic)) {
      userPrompt = `选题：${effectiveTopic}\n\n${userPrompt}`;
    }
    if (hasTitle) {
      userPrompt += `\n\n【重要】文章标题已指定为："${userTitle.trim()}"，请直接使用此标题生成文章，不要自行拟定标题。`;
    }

    // 添加写作要求和排版规则
    const writingRequirements = `
【核心原则：句子即段落】
这是最重要的规则，请严格遵守：
- 每句话独立成段（一个段落只包含一句话）
- 句子要短小精炼，一般15-25个字
- 句子之间必须空一行（段落分隔）
- 不要把多句话放在同一个段落里

【文章结构要求】
一、Markdown标题格式
- 主标题：# 主标题内容（一行）
- 一级标题：## 第一个主题（一行）
- 二级标题：### 小节标题（一行）

二、图片分布
${imageSource === 'ai' && imageCount > 0 ? `- 生成 ${imageCount} 张图片，均匀分布：
  - 开头：{{IMAGE_1}}
  - 中间：${imageCount > 2 ? `{{IMAGE_2}}` : '{{IMAGE_2替代文字段落}'}
  - 结尾：{{IMAGE_${imageCount}}}
- 图片占位符单独一行，前后各空一行` : imageSource === 'upload' ? `- 预留图片位置：{{IMAGE_PLACEHOLDER}}` : `- 不生成图片`}

三、排版规则（严格执行）
1. 句子独立成段，一段一句
2. 段间空一行分隔
3. 全文左对齐，无首行缩进
4. 不要写长句子（超过30字要拆分）

四、强调格式
- **红色加粗**：分论点开头、关键结论
- 引用内容：左侧灰色竖线标记
- 重要词语：可以加粗但不要太多

五、内容要求
1. 总字数900-1100字
2. 句子要短，一句话说清楚一件事
3. 前100字必须有强钩子吸引读者
4. 不要写"配图"、"图1"等说明
5. 不要写"完"、"END"等结束语`;

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

    // ========== 原子化随机排版 ==========
    let finalContent = cleanedContent;
    let typographyResult = null;
    
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
