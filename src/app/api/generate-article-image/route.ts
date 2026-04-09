import { NextRequest, NextResponse } from 'next/server';

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
      imagePrompt = `根据文章标题"${title}"生成一张配图，风格适合公众号文章，简洁美观，色调温和`;
    } else if (content) {
      // 提取文章的前200字作为参考
      const previewContent = content.substring(0, 200);
      imagePrompt = `根据文章内容"${previewContent}"生成一张配图，风格适合公众号文章，简洁美观，色调温和`;
    }

    // 调用generate_image技能生成图片
    const generateImageResponse = await fetch(
      `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || ''}/api/generate-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [
            {
              prompt: imagePrompt,
              count: 1,
              size: {
                width: 1200,
                height: 630,
              },
            },
          ],
        }),
      }
    );

    if (!generateImageResponse.ok) {
      throw new Error('生成图片失败');
    }

    const imageData = await generateImageResponse.json();

    return NextResponse.json({
      success: true,
      imageUrl: imageData.images?.[0]?.url || '',
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
