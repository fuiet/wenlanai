import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface GenerateRequest {
  title?: string;
  topic?: string; // 文章主题（必填，作为搜索关键词）
  templateId: string;
  groupId?: string;
  groupName?: string;
  imageSource?: 'ai' | 'original';
  imageCount?: number;
  enableMaterial?: boolean;
  materialLinks?: string;
  materialRequirements?: string;
  searchEnabled?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      title: providedTitle,
      topic,
      templateId,
      groupId,
      groupName,
      imageSource = 'ai',
      imageCount = 3,
      enableMaterial = false,
      materialLinks = '',
      materialRequirements = '',
      searchEnabled = true
    } = body;

    // 检查 Supabase 配置
    const configuredSupabaseUrl = process.env.COZE_SUPABASE_URL;
    const configuredSupabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!configuredSupabaseUrl || !configuredSupabaseKey) {
      return NextResponse.json(
        { error: '数据库配置缺失，请联系管理员' },
        { status: 500 }
      );
    }

    console.log('开始生成文章...');
    console.log('文章主题（搜索关键词）:', topic);
    console.log('文章标题:', providedTitle);
    console.log('搜索是否启用:', searchEnabled);

    // 初始化 Supabase 客户端
    const supabase = createClient(configuredSupabaseUrl, configuredSupabaseKey);

    // 获取提示词模板
    let templatePrompt = '';
    let templateName = '';
    if (templateId) {
      const { data: template } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (template) {
        templatePrompt = template.prompt;
        templateName = template.name || '';
      }
    }

    // 第一步：搜索最新信息（如果启用了搜索且有用户提供的主题）
    let searchResults = '';
    // 使用 topic 作为搜索关键词，如果没有 topic 则使用 providedTitle
    const searchKeyword = topic || providedTitle || '';
    let generatedTitle = providedTitle || '';
    
    if (searchEnabled && searchKeyword) {
      console.log('正在搜索最新信息，关键词:', searchKeyword);
      try {
        const { SearchClient, Config } = await import('coze-coding-dev-sdk');
        const config = new Config();
        const searchClient = new SearchClient(config);
        
        // 搜索最新信息
        const searchResponse = await searchClient.webSearch(
          searchKeyword,
          10,
          true
        );
        
        if (searchResponse && searchResponse.web_items) {
          // 构建搜索结果摘要
          const resultSummaries = searchResponse.web_items.map((item: any) => {
            return `【来源: ${item.site_name || '未知'}】${item.title}\n${item.snippet || ''}`;
          }).join('\n\n');
          
          // 获取AI生成的摘要
          const aiSummary = searchResponse.summary || '';
          
          searchResults = `
【最新网络信息摘要】
${aiSummary ? 'AI摘要: ' + aiSummary + '\n\n' : ''}
【搜索结果】\n${resultSummaries}
          `.trim();
          
          console.log('搜索完成，获取到', searchResponse.web_items.length, '条结果');
        }
      } catch (searchError) {
        console.error('搜索失败:', searchError);
        // 搜索失败不影响后续流程
      }
    }

    // 如果没有提供标题，从搜索结果或素材生成爆款标题
    if (!generatedTitle && (templatePrompt || searchResults)) {
      console.log('正在生成爆款标题...');
      try {
        const { LLMClient } = await import('coze-coding-dev-sdk');
        const llmClient = new LLMClient();
        
        // 使用搜索结果和主题生成标题
        const titleContext = searchResults || `主题：${templatePrompt?.substring(0, 300)}`;
        
        const titlePrompt = `你是一个资深公众号运营专家，擅长写能让读者"忍不住点击"的爆款标题。

请根据以下主题/内容，生成5个爆款标题：

${titleContext}

【爆款标题公式】（必须全部满足）：
1. 引发好奇：用"绝大多数人不知道"、"竟然"、"原来"等引发好奇
2. 数字吸引：用具体数字如"3招"、"5个方法"、"1件事"等
3. 情感共鸣：触及中老年读者的情感需求（健康、家庭、子女、养老）
4. 实用价值：让读者觉得"看了有用"
5. 限时紧迫：制造紧迫感如"现在知道还不晚"

【标题要求】：
1. 每个标题20-30字，必须有冲击力
2. 不能用emoji符号
3. 不要太标题党，要真实可信
4. 适合中老年读者群体
5. 严禁使用"震惊"类低俗词汇

请只返回5个标题，每行一个，不要加序号，不要任何解释：`;

        const titleResponse = await llmClient.invoke([
          { role: 'user', content: titlePrompt }
        ]);

        if (titleResponse && titleResponse.content) {
          const content = titleResponse.content as string;
          console.log('标题生成结果:', content);
          const lines = content.split('\n').filter((t: string) => t.trim());
          console.log('解析到的行数:', lines.length);
          
          if (lines.length > 0) {
            // 找到第一个可能是标题的行
            for (const line of lines) {
              const cleanLine = line.replace(/^[【】\[\]「」""''1234567890.、\s%#@!！?？]+/g, '').trim();
              // 过滤掉纯数字、符号开头或包含大量链接的内容
              if (cleanLine.length >= 10 && cleanLine.length <= 50 && !cleanLine.includes('http') && !cleanLine.includes('storage')) {
                generatedTitle = cleanLine;
                if (generatedTitle.length > 35) {
                  generatedTitle = generatedTitle.substring(0, 35);
                }
                break;
              }
            }
          }
          
          // 如果没有生成标题，使用主题作为默认标题
          if (!generatedTitle) {
            generatedTitle = `关于${topic}的深度解读`;
          }
        }
      } catch (titleError) {
        console.error('生成标题失败:', titleError);
      }
    }

    console.log('标题确定:', generatedTitle);

    // 第二步：获取参考素材内容
    let referenceContent = '';
    if (enableMaterial && materialLinks && materialLinks.length > 0) {
      try {
        const links = materialLinks.split('\n').filter((l: string) => l.trim());
        const fetchPromises = links.slice(0, 3).map(async (url: string) => {
          try {
            const response = await fetch(`/api/fetch-url?url=${encodeURIComponent(url.trim())}`);
            if (response.ok) {
              const data = await response.json();
              return data.content || '';
            }
          } catch (e) {
            console.error('获取链接内容失败:', e);
          }
          return '';
        });
        
        const contents = await Promise.all(fetchPromises);
        referenceContent = contents.filter(c => c).join('\n\n---\n\n');
      } catch (e) {
        console.error('处理参考素材失败:', e);
      }
    }

    // 第三步：生成文章内容（结合搜索结果 + 提示词）
    console.log('正在生成文章内容...');
    let generatedContent = '';

    try {
      const { LLMClient } = await import('coze-coding-dev-sdk');
      const llmClient = new LLMClient();

      // 构建文章生成的完整提示词
      let articlePrompt = '';

      // 添加标题
      if (generatedTitle) {
        articlePrompt += `【文章标题】${generatedTitle}\n\n`;
      }

      // 添加搜索结果（如果存在）
      if (searchResults) {
        articlePrompt += `【最新网络信息】（请务必结合以下最新信息进行创作）\n${searchResults}\n\n`;
      }

      // 添加提示词模板
      if (templatePrompt) {
        articlePrompt += `【写作风格要求】\n${templatePrompt}\n\n`;
      }

      // 添加参考素材
      if (referenceContent) {
        articlePrompt += `【用户提供的参考素材】\n${referenceContent}\n\n`;
      }

      // 添加创作要求
      if (materialRequirements) {
        articlePrompt += `【用户创作要求】\n${materialRequirements}\n\n`;
      }

      // 添加字数要求和排版要求
      articlePrompt += `【字数要求】请创作一篇1000字左右的文章（允许±100字误差）。

【排版要求 - 非常重要】：
1. 文章结构：使用 ## 标题 格式组织文章结构，如：
   ## 开篇引入
   （内容...）
   ## 核心观点一
   （内容...）
   ## 核心观点二
   （内容...）
   ## 总结建议
   （内容...）

2. 图片插入位置：在开头引入段落后插入第一张图片，中间每个大段落后插入图片，结尾前再插入一张
3. 每张图片用 "![图片描述](IMAGE_PLACEHOLDER_n)" 格式标记，其中n是图片序号
4. 总共需要 ${imageCount || 2} 张图片

【文章结构要求】：
1. 开头：用引人入胜的引言/故事/数据开头，吸引读者继续阅读
2. 中间：分2-3个 ## 标题 的段落，每个段落之间用"---"分割线分隔
3. 结尾：## 总结建议 作为最后一个大标题，总结要点，给出建议或呼吁行动
4. 可以使用"**加粗**"强调关键词和重要数据
5. 重要观点使用 ## 标题 格式突出

【重要提醒】：
1. 如果提供了【最新网络信息】，必须结合这些信息进行创作
2. 严格按照【写作风格要求】的文风进行创作
3. 严禁使用emoji和特殊符号
4. 严禁使用"震惊"类低俗词汇
5. 文章内容要真实、有价值，符合公众号发布标准`;

      console.log('文章提示词构建完成，开始调用LLM...');
      
      const articleResponse = await llmClient.invoke([
        { role: 'user', content: articlePrompt }
      ]);

      if (articleResponse && articleResponse.content) {
        let rawContent = articleResponse.content as string;
        
        // 清理内容：移除可能混入的图片URL
        rawContent = rawContent.replace(/https?:\/\/[^\s\)\"'\\]+/g, '');
        // 清理多余的空白行
        rawContent = rawContent.replace(/\n{3,}/g, '\n\n');
        // 确保标题在开头（如果有标题）
        const titleMatch = rawContent.match(/^#?\s*(.+)[\n\r]/);
        if (titleMatch && !rawContent.startsWith(generatedTitle)) {
          // 标题已存在但不是用户指定的
        }
        
        generatedContent = rawContent.trim();
      } else {
        throw new Error('生成内容为空');
      }
    } catch (contentError) {
      console.error('生成文章内容失败:', contentError);
      generatedContent = `文章内容生成失败，请稍后重试。`;
    }

    console.log('生成文章内容完成，字数:', generatedContent.length);

    // 第四步：生成图片
    let imageUrls: string[] = [];
    
    if (imageSource === 'ai' && imageCount > 0) {
      console.log(`正在生成${imageCount}张图片...`);
      
      try {
        const { ImageGenerationClient } = await import('coze-coding-dev-sdk');
        const imageClient = new ImageGenerationClient();

        // 为每张图片生成描述并创建
        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          try {
            let imagePrompt = `文章配图，温馨生活场景，适合中老年读者`;
            
            // 根据文章内容生成更精准的图片描述
            const { LLMClient } = await import('coze-coding-dev-sdk');
            const llmClient = new LLMClient();
            
            const imageDescResponse = await llmClient.invoke([
              { role: 'user', content: `请为以下文章生成一个简短的图片描述（20字以内），用于AI生成配图：

${generatedContent.substring(0, 500)}

要求：描述要具体、温馨，适合文章内容。` }
            ]);

            if (imageDescResponse && imageDescResponse.content) {
              imagePrompt = (imageDescResponse.content as string).trim();
              if (imagePrompt.length > 50) {
                imagePrompt = imagePrompt.substring(0, 50);
              }
            }

            const imageResponse = await imageClient.generate({
              prompt: imagePrompt,
              size: '1:1'
            });

            if (imageResponse && imageResponse.data && imageResponse.data.length > 0) {
              const imageData = imageResponse.data[0];
              if (imageData && imageData.url) {
                imageUrls.push(imageData.url);
              }
            }
          } catch (imgError) {
            console.error(`生成第${i + 1}张图片失败:`, imgError);
          }
        }
      } catch (imageError) {
        console.error('生成图片失败:', imageError);
      }
    }

    console.log('生成图片完成，数量:', imageUrls.length);

    // 清理文章内容：过滤掉图片链接，只保留纯文本
    let cleanedContent = generatedContent;
    
    // 过滤掉 Markdown 图片格式 ![xxx](url)
    cleanedContent = cleanedContent.replace(/!\[.*?\]\(.*?\)/g, '');
    
    // 过滤掉残留的 IMAGE_PLACEHOLDER 标记
    cleanedContent = cleanedContent.replace(/\[IMAGE_PLACEHOLDER_\d+\]/g, '');
    
    // 过滤掉 IMAGE_REPLACED 占位符
    cleanedContent = cleanedContent.replace(/IMAGE_REPLACED/g, '');
    
    // 过滤掉纯 URL 链接（图片存储链接）
    cleanedContent = cleanedContent.replace(/https?:\/\/storage[^\s]*/gi, '');
    
    // 过滤掉任何包含 storage/ 的文本（整行删除包含图片链接的行）
    cleanedContent = cleanedContent.split('\n')
      .filter(line => !line.includes('storage/'))
      .join('\n');
    
    // 过滤掉包含 Image: [URL] 或 Image: URL 格式的行
    cleanedContent = cleanedContent.split('\n')
      .filter(line => !/Image\s*:\s*\[?https?:\/\//i.test(line))
      .join('\n');
    
    // 过滤掉包含 .png .jpg .jpeg .gif 等图片扩展名的行（如果是链接形式）
    cleanedContent = cleanedContent.split('\n')
      .filter(line => {
        // 如果行只是纯链接或包含链接的描述，才过滤
        if (/^!?\[.*?\]\(.*?\.(png|jpg|jpeg|gif|webp)/i.test(line.trim())) return false;
        if (/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i.test(line.trim())) return false;
        return true;
      })
      .join('\n');
    
    // 清理多余空行
    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');
    
    // 去除首尾空白
    cleanedContent = cleanedContent.trim();

    // 处理文章内容中的图片标记，将 IMAGE_PLACEHOLDER 替换为实际图片
    let finalContent = cleanedContent;
    
    // 保存纯文本内容到数据库，图片URL单独存储
    let pureTextContent = cleanedContent;
    
    if (imageUrls.length > 0 && generatedContent) {
      // 处理剩余未替换的图片标记（如果没有足够的标记，清理掉）
      const paragraphs = finalContent.split('\n\n');
      const cleanedParagraphs = paragraphs.map(p => p.replace(/!\[.*?\]\(.*?\)/g, '').trim()).filter(p => p);
      finalContent = cleanedParagraphs.join('\n\n');
      pureTextContent = finalContent;
      
      // 图片将在前端根据 images 字段渲染，不写入 content
    }

    // 保存文章到数据库
    console.log('保存文章到数据库...');
    
    const { data: userData } = await supabase.auth.admin.listUsers();
    const userId = userData?.users?.[0]?.id || 'demo-user';

    const { data: savedArticle, error: saveError } = await supabase
      .from('articles')
      .insert({
        title: generatedTitle || '未命名文章',
        content: pureTextContent,  // 保存纯文本内容
        author: groupName || '未知',
        group_name: groupName || null,
        status: 'completed',
        push_status: 'none',
        images: imageUrls,  // 图片单独存储
        created_by: userId
      })
      .select()
      .single();

    if (saveError) {
      console.error('保存文章失败:', saveError);
      throw saveError;
    }

    console.log('文章生成完成:', savedArticle?.id);

    return NextResponse.json({
      success: true,
      message: '文章生成成功',
      data: savedArticle
    });

  } catch (error: any) {
    console.error('生成文章失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成文章失败，请稍后重试' },
      { status: 500 }
    );
  }
}
