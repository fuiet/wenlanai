import { NextRequest, NextResponse } from 'next/server';

/**
 * 一键推送到公众号草稿箱 API
 * 
 * 此API将文章内容推送到公众号草稿箱
 * 
 * 请求格式：
 * POST /api/push-to-wechat
 * {
 *   "title": "文章标题",
 *   "content": "文章内容（Markdown格式）",
 *   "imageUrls": ["图片URL数组"]
 * }
 * 
 * 响应格式：
 * {
 *   "success": true,
 *   "message": "推送成功",
 *   "data": {
 *     "draftId": "草稿ID"
 *   }
 * }
 */

// 公众号API配置
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';
const WECHAT_ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token';
const WECHAT_DRAFT_URL = 'https://api.weixin.qq.com/cgi-bin/draft/add';

/**
 * 获取微信Access Token
 */
async function getAccessToken(): Promise<string | null> {
  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
    console.log('微信配置缺失，跳过真实推送');
    return null;
  }

  try {
    const response = await fetch(
      `${WECHAT_ACCESS_TOKEN_URL}?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`
    );
    const data = await response.json();
    
    if (data.access_token) {
      return data.access_token;
    }
    
    console.error('获取Access Token失败:', data);
    return null;
  } catch (error) {
    console.error('获取Access Token异常:', error);
    return null;
  }
}

/**
 * 上传图片到微信素材库
 */
async function uploadImageToWechat(accessToken: string, imageUrl: string): Promise<string | null> {
  try {
    // 下载图片
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);

    // 上传到微信
    const formData = new FormData();
    formData.append('media', imageBlob, 'image.jpg');

    const uploadResponse = await fetch(
      `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=image`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const result = await uploadResponse.json();
    
    if (result.media_id) {
      return result.media_id;
    }
    
    console.error('上传图片失败:', result);
    return null;
  } catch (error) {
    console.error('上传图片异常:', error);
    return null;
  }
}

/**
 * 将Markdown内容转换为微信文章格式
 */
function convertMarkdownToWechatContent(markdown: string): any {
  // 简单的Markdown转富文本逻辑
  // 实际生产环境需要更复杂的解析
  let content = markdown;
  
  // 转换标题
  content = content.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  content = content.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  content = content.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // 转换加粗
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 转换斜体
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // 转换段落（保留换行）
  content = content.split('\n\n').map(p => {
    if (!p.trim()) return '';
    if (p.startsWith('<h') || p.startsWith('<p')) return p;
    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return {
    author: '',
    content: content,
    content_source_url: '',
    digest: markdown.substring(0, 54) + '...',
    need_open_comment: 1,
    only_fans_can_comment: 0,
    thumb_media_id: '',
    title: '',
  };
}

/**
 * POST /api/push-to-wechat
 * 推送文章到公众号草稿箱
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, imageUrls = [] } = body;

    // 参数验证
    if (!title && !content) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数：标题或内容' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { success: false, message: '文章内容不能为空' },
        { status: 400 }
      );
    }

    // 检查是否配置了微信API
    const accessToken = await getAccessToken();

    if (!accessToken) {
      // 模拟成功响应（用于演示）
      console.log('微信API未配置，模拟推送成功');
      return NextResponse.json({
        success: true,
        message: '模拟推送成功（微信API未配置）',
        data: {
          draftId: `mock_${Date.now()}`,
          title: title || '未命名文章',
          contentLength: content.length,
        },
        mock: true,
      });
    }

    // 上传图片到微信素材库
    const uploadedImages: string[] = [];
    for (const imageUrl of imageUrls) {
      const mediaId = await uploadImageToWechat(accessToken, imageUrl);
      if (mediaId) {
        uploadedImages.push(mediaId);
      }
    }

    // 替换内容中的图片URL为media_id
    let processedContent = content;
    for (let i = 0; i < uploadedImages.length && i < imageUrls.length; i++) {
      processedContent = processedContent.replace(imageUrls[i], uploadedImages[i]);
    }

    // 构建草稿内容
    const articles = [
      {
        title: title || '未命名文章',
        author: '',
        digest: content.substring(0, 54) + '...',
        content: processedContent,
        content_source_url: '',
        thumb_media_id: uploadedImages[0] || '',
        need_open_comment: 1,
        only_fans_can_comment: 0,
        is_article: 1,
      },
    ];

    // 创建草稿
    const draftResponse = await fetch(
      `${WECHAT_DRAFT_URL}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articles }),
      }
    );

    const draftResult = await draftResponse.json();

    if (draftResult.media_id) {
      return NextResponse.json({
        success: true,
        message: '推送成功，文章已发送到公众号草稿箱',
        data: {
          draftId: draftResult.media_id,
        },
      });
    }

    console.error('创建草稿失败:', draftResult);
    return NextResponse.json(
      { success: false, message: draftResult.errmsg || '创建草稿失败' },
      { status: 500 }
    );

  } catch (error) {
    console.error('推送文章异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/push-to-wechat
 * 获取推送状态
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: '推送API正常',
    config: {
      wechatAppIdConfigured: !!WECHAT_APP_ID,
      wechatSecretConfigured: !!WECHAT_APP_SECRET,
    },
  });
}
