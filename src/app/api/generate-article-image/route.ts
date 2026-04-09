import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 根据文章内容生成配图
 */
export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();

    if (!title && !content) {
      return NextResponse.json(
        { error: '请提供标题或内容' },
        { status: 400 }
      );
    }

    // 从文章内容中提取关键信息用于生成图片
    let imagePrompt = '';

    if (title) {
      imagePrompt = `A beautiful illustration for an article titled "${title}", clean and modern style, warm colors, suitable for WeChat article`;
    } else if (content) {
      // 提取文章的前200字作为参考
      const previewContent = content.substring(0, 200);
      imagePrompt = `A beautiful illustration for article content about "${previewContent}", clean and modern style, warm colors, suitable for WeChat article`;
    }

    console.log('开始生成图片，提示词:', imagePrompt);

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    // 生成图片 - 使用2K分辨率（约2048x1080）
    const response = await client.generate({
      prompt: imagePrompt,
      size: '2K',
      watermark: false, // 不加水印
    });

    const helper = client.getResponseHelper(response);

    console.log('图片生成完成:', response);

    if (!helper.success) {
      throw new Error(helper.errorMessages.join(', '));
    }

    if (!helper.imageUrls || helper.imageUrls.length === 0) {
      throw new Error('生成图片失败，未返回图片');
    }

    return NextResponse.json({
      success: true,
      imageUrl: helper.imageUrls[0],
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
