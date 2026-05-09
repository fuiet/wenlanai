import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { query } from '@/lib/db';

interface GenerateRequest {
  title?: string;
  topic?: string;
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

// 获取当前用户ID
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;

  const result = await query(
    `SELECT user_id FROM sessions 
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );

  return result.rows.length > 0 ? result.rows[0].user_id : null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body: GenerateRequest = await request.json();
    const {
      title: providedTitle,
      topic,
      templateId,
      groupName,
      imageSource = 'ai',
      imageCount = 3,
      enableMaterial = false,
      materialLinks = '',
      materialRequirements = '',
      searchEnabled = true
    } = body;

    const configuredSupabaseUrl = process.env.COZE_SUPABASE_URL;
    const configuredSupabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!configuredSupabaseUrl || !configuredSupabaseKey) {
      return NextResponse.json(
        { error: '数据库配置缺失' },
        { status: 500 }
      );
    }

    const supabase = createClient(configuredSupabaseUrl, configuredSupabaseKey);

    // 获取提示词模板
    let templatePrompt = '';
    if (templateId) {
      const { data: template } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (template) {
        templatePrompt = template.prompt;
      }
    }

    // 搜索最新信息
    let searchResults = '';
    const searchKeyword = topic || providedTitle || '';
    let generatedTitle = providedTitle || ''; // 如果没有提供标题，将在生成文章后从内容中提取
    
    if (searchEnabled && searchKeyword) {
      try {
        const { SearchClient, Config } = await import('coze-coding-dev-sdk');
        const config = new Config();
        const searchClient = new SearchClient(config);
        
        const searchResponse = await searchClient.webSearch(searchKeyword, 10, true);
        
        if (searchResponse && searchResponse.web_items) {
          const resultSummaries = searchResponse.web_items.map((item: any) => {
            return `【来源: ${item.site_name || '未知'}】${item.title}\n${item.snippet || ''}`;
          }).join('\n\n');
          
          const aiSummary = searchResponse.summary || '';
          
          searchResults = `
【最新网络信息摘要】
${aiSummary}

【详细信息】
${resultSummaries}`;
        }
      } catch (e) {
        console.error('搜索失败:', e);
      }
    }

    // 处理参考素材
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

    // 生成文章内容
    let generatedContent = '';
    try {
      const { LLMClient } = await import('coze-coding-dev-sdk');
      const llmClient = new LLMClient();

      let articlePrompt = '';
      if (generatedTitle) {
        articlePrompt += `【文章标题】${generatedTitle}\n\n`;
      }
      if (searchResults) {
        articlePrompt += `【最新网络信息】（请务必结合以下最新信息进行创作）\n${searchResults}\n\n`;
      }
      if (templatePrompt) {
        articlePrompt += `【写作风格要求】\n${templatePrompt}\n\n`;
      }
      if (referenceContent) {
        articlePrompt += `【用户提供的参考素材】\n${referenceContent}\n\n`;
      }
      if (materialRequirements) {
        articlePrompt += `【用户创作要求】\n${materialRequirements}\n\n`;
      }

      articlePrompt += `【字数要求】请创作一篇1000字左右的文章（允许±100字误差）。

【排版格式要求 - 非常重要】：
1. 如果没有提供标题，请根据文章主题生成一个吸引人的标题，放在文章开头，格式：# 文章标题
2. 文章主体使用 ## 标题 格式组织文章结构
3. 图片插入：使用 "![图片描述](IMAGE_PLACEHOLDER_n)" 格式标记，其中n是图片序号
4. 总共需要 ${imageCount || 2} 张图片

【段落格式要求 - 必须遵守】：
1. **段落要短小精炼**：每个段落控制在3-5句话以内，50-150字左右
2. **段落之间必须空一行**：段落与段落之间用空行分隔，增强阅读节奏感
3. **重点内容单独成段**：每段的观点、结论、数据等核心内容要单独成段，不要堆砌在一个段落中
4. **长段落必须拆分**：如果一个段落超过5句，必须拆分成多个短段落
5. **条理清晰**：每段聚焦一个主题，不要把多个主题混在一个段落里

【重要提醒】：
1. 如果提供了【最新网络信息】，必须结合这些信息进行创作
2. 严禁使用emoji和特殊符号
3. 文章内容要真实、有价值，符合公众号发布标准`;

      const articleResponse = await llmClient.invoke([
        { role: 'user', content: articlePrompt }
      ], {
        model: "deepseek-v3-2-251201"
      });

      if (articleResponse && articleResponse.content) {
        let rawContent = articleResponse.content as string;
        rawContent = rawContent.replace(/https?:\/\/[^\s\)\"'\\]+/g, '');
        rawContent = rawContent.replace(/\n{3,}/g, '\n\n');
        generatedContent = rawContent.trim();
        
        // 如果没有提供标题，从文章内容中提取（支持 # 或 ## 标题）
        if (!providedTitle || providedTitle === '') {
          // 先尝试提取第一个 # 或 ## 标题
          const titleMatch = generatedContent.match(/^#+\s*(.+?)[\n\r]/);
          if (titleMatch) {
            generatedTitle = titleMatch[1].trim();
            generatedContent = generatedContent.replace(/^#+\s*.+?[\n\r]+/, '');
          } else {
            // 尝试取第一行作为标题
            const firstLine = generatedContent.split(/\n/)[0].trim();
            if (firstLine && firstLine.length < 50 && !firstLine.startsWith('![') && !firstLine.startsWith('-')) {
              generatedTitle = firstLine.replace(/^[#*\s]+/, '');
              generatedContent = generatedContent.replace(/^.+\n+/, '');
            }
          }
        }
      } else {
        throw new Error('生成内容为空');
      }
    } catch (contentError) {
      console.error('生成文章内容失败:', contentError);
      generatedContent = `文章内容生成失败，请稍后重试。`;
    }

    // 生成图片
    let imageUrls: string[] = [];
    
    if (imageSource === 'ai' && imageCount > 0) {
      try {
        const { ImageGenerationClient } = await import('coze-coding-dev-sdk');
        const imageClient = new ImageGenerationClient();

        // 根据文章内容生成相关的图片提示词
        const articleKeywords = generatedContent.substring(0, 200).replace(/[#*\n]/g, ' ').trim();
        const articleTheme = generatedTitle || topic;
        
        const imagePrompts = [
          `文章主题 "${articleTheme}" 的配图，${articleKeywords.substring(0, 50)}，专业摄影风格，温暖色调，高质量`,
          `${articleKeywords.substring(0, 80)}，文章配图，真实场景，专业摄影`,
          `${articleKeywords.substring(0, 60)}相关配图，情感表达，温暖治愈风格`
        ];

        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          try {
            const imagePrompt = imagePrompts[i] || imagePrompts[0];
            
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

    // 清理文章内容
    let cleanedContent = generatedContent;
    cleanedContent = cleanedContent.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanedContent = cleanedContent.replace(/\[IMAGE_PLACEHOLDER_\d+\]/g, '');
    cleanedContent = cleanedContent.replace(/IMAGE_REPLACED/g, '');
    cleanedContent = cleanedContent.replace(/https?:\/\/storage[^\s]*/gi, '');
    cleanedContent = cleanedContent.split('\n').filter(line => !line.includes('storage/')).join('\n');
    cleanedContent = cleanedContent.split('\n').filter(line => !/Image\s*:\s*\[?https?:\/\//i.test(line)).join('\n');
    cleanedContent = cleanedContent.split('\n').filter(line => {
      if (/^!?\[.*?\]\(.*?\.(png|jpg|jpeg|gif|webp)/i.test(line.trim())) return false;
      if (/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i.test(line.trim())) return false;
      return true;
    }).join('\n');
    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim();

    // 保存文章到数据库（关联到当前用户）
    const { data: savedArticle, error: saveError } = await supabase
      .from('articles')
      .insert({
        created_by: userId,  // 关联当前用户
        title: generatedTitle || '未命名文章',
        content: cleanedContent,
        author: groupName || '未知',
        group_name: groupName || null,
        status: 'completed',
        push_status: 'none',
        images: imageUrls
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
