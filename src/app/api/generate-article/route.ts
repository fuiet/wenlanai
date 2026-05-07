import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface GenerateRequest {
  title?: string;
  templateId: string;
  groupId?: string;
  groupName?: string;
  imageSource?: 'ai' | 'original';
  imageCount?: number;
  enableMaterial?: boolean;
  materialLinks?: string;
  materialRequirements?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      title: providedTitle,
      templateId,
      groupId,
      groupName,
      imageSource = 'ai',
      imageCount = 3,
      enableMaterial = false,
      materialLinks = '',
      materialRequirements = ''
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

    // 初始化 Supabase 客户端
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

    let generatedTitle = providedTitle || '';

    // 如果没有提供标题，生成标题
    if (!generatedTitle) {
      console.log('正在生成标题...');
      try {
        const { LLMClient } = await import('coze-coding-dev-sdk');
        const llmClient = new LLMClient();
        
        const titlePrompt = `请为以下主题生成3个吸引人的文章标题，每个标题不超过30字：

主题：${materialRequirements || templatePrompt.substring(0, 200)}

要求：
1. 标题要吸引人，能引发读者好奇
2. 使用数字、疑问、感叹等方式增加吸引力
3. 适合中老年读者群体
4. 不要使用emoji

请只返回标题，每行一个，不要加序号。`;

        const titleResponse = await llmClient.invoke([
          { role: 'user', content: titlePrompt }
        ]);

        if (titleResponse && titleResponse.content) {
          const content = titleResponse.content as string;
          const lines = content.split('\n').filter((t: string) => t.trim());
          if (lines.length > 0) {
            generatedTitle = lines[Math.floor(Math.random() * lines.length)].replace(/^\d+[\.、]\s*/, '').trim();
            if (generatedTitle.length > 50) {
              generatedTitle = generatedTitle.substring(0, 50);
            }
          }
        }
      } catch (titleError) {
        console.error('生成标题失败:', titleError);
        generatedTitle = `精彩文章 - ${new Date().toLocaleDateString()}`;
      }
    }

    console.log('生成标题完成:', generatedTitle);

    // 获取参考素材内容
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
    console.log('正在生成文章内容...');
    let generatedContent = '';

    try {
      const { LLMClient } = await import('coze-coding-dev-sdk');
      const llmClient = new LLMClient();

      let articlePrompt = templatePrompt;
      
      // 如果有标题，添加到提示词中
      if (generatedTitle) {
        articlePrompt = `请根据以下要求创作一篇1000字左右的文章：

文章标题：${generatedTitle}

${templatePrompt}`;
      }

      // 添加参考素材
      if (referenceContent) {
        articlePrompt += `\n\n参考素材：\n${referenceContent}`;
      }

      // 添加创作要求
      if (materialRequirements) {
        articlePrompt += `\n\n创作要求：\n${materialRequirements}`;
      }

      articlePrompt += `\n\n请创作一篇结构完整、内容丰富的文章。`;

      const articleResponse = await llmClient.invoke([
        { role: 'user', content: articlePrompt }
      ]);

      if (articleResponse && articleResponse.content) {
        generatedContent = articleResponse.content as string;
      } else {
        throw new Error('生成内容为空');
      }
    } catch (contentError) {
      console.error('生成文章内容失败:', contentError);
      generatedContent = `文章内容生成失败，请稍后重试。`;
    }

    console.log('生成文章内容完成，字数:', generatedContent.length);

    // 生成图片
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

    // 将图片插入到文章中
    if (imageUrls.length > 0 && generatedContent) {
      const imageMarkdown = imageUrls.map(url => `\n\n![配图](${url})\n\n`).join('');
      // 在文章中间插入图片
      const midpoint = Math.floor(generatedContent.length / 2);
      const insertPoint = generatedContent.lastIndexOf('\n\n', midpoint);
      if (insertPoint > 0) {
        generatedContent = generatedContent.substring(0, insertPoint + 2) + imageMarkdown + generatedContent.substring(insertPoint + 2);
      } else {
        generatedContent += imageMarkdown;
      }
    }

    // 保存文章到数据库
    console.log('保存文章到数据库...');
    
    const { data: userData } = await supabase.auth.admin.listUsers();
    const userId = userData?.users?.[0]?.id || 'demo-user';

    const { data: savedArticle, error: saveError } = await supabase
      .from('articles')
      .insert({
        title: generatedTitle || '未命名文章',
        content: generatedContent,
        author: groupName || '未知',
        group_name: groupName || null,
        status: 'completed',
        push_status: 'none',
        images: imageUrls,
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
