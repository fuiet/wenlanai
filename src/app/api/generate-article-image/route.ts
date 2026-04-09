import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 根据文章内容生成配图
 */
export async function POST(request: NextRequest) {
  try {
    const { title, content, count = 3 } = await request.json();

    if (!title && !content) {
      return NextResponse.json(
        { error: '请提供标题或内容' },
        { status: 400 }
      );
    }

    // 随机生成2-3张图片
    const imageCount = Math.min(Math.max(count, 2), 3);

    console.log(`开始生成 ${imageCount} 张图片`);

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 为每张图片生成不同的提示词
    const imagePrompts: string[] = [];

    for (let i = 0; i < imageCount; i++) {
      let imagePrompt = '';

      if (title) {
        imagePrompt = `A beautiful illustration ${i + 1} for an article titled "${title}", clean and modern style, warm colors, suitable for WeChat article`;
      } else if (content) {
        // 提取文章的不同部分作为参考
        const contentLength = content.length;
        const start = Math.floor((contentLength * i) / imageCount);
        const end = Math.floor((contentLength * (i + 1)) / imageCount);
        const previewContent = content.substring(start, Math.min(end, start + 200));
        imagePrompt = `A beautiful illustration ${i + 1} for article content about "${previewContent}", clean and modern style, warm colors, suitable for WeChat article`;
      }

      imagePrompts.push(imagePrompt);
    }

    // 批量生成图片
    const requests = imagePrompts.map(prompt => ({
      prompt,
      size: '2K',
      watermark: false,
    }));

    const responses = await client.batchGenerate(requests);
    const imageUrls: string[] = [];

    responses.forEach((response, i) => {
      const helper = client.getResponseHelper(response);

      if (helper.success && helper.imageUrls && helper.imageUrls.length > 0) {
        imageUrls.push(helper.imageUrls[0]);
      } else {
        console.error(`图片 ${i + 1} 生成失败:`, helper.errorMessages);
      }
    });

    console.log(`成功生成 ${imageUrls.length}/${imageCount} 张图片`);

    if (imageUrls.length === 0) {
      throw new Error('生成图片失败，未返回任何图片');
    }

    return NextResponse.json({
      success: true,
      imageUrls,
      message: '图片生成成功',
    });
  } catch (error) {
    console.error('生成图片失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成图片失败' },
      { status: 500 }
    );
  }
}
