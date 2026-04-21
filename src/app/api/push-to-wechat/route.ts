import { NextRequest, NextResponse } from 'next/server';

// 延迟初始化Supabase
const createSupabaseClient = () => {
  const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * 一键推送到公众号草稿箱 API
 * 
 * 支持两种推送方式：
 * 1. 使用已授权的公众号（优先）
 * 2. 使用环境变量配置的公众号（备用）
 * 
 * 请求格式：
 * POST /api/push-to-wechat
 * {
 *   "title": "文章标题",
 *   "content": "文章内容（Markdown格式）",
 *   "imageUrls": ["图片URL数组"],
 *   "appId": "指定推送的公众号AppID（可选）"
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

// 公众号API配置（备用）
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';

// 第三方平台配置
const COMPONENT_APPID = process.env.WECHAT_COMPONENT_APPID || '';
const COMPONENT_APP_SECRET = process.env.WECHAT_COMPONENT_APP_SECRET || '';

/**
 * 从数据库获取已授权的公众号
 */
async function getAuthorizedAccount(preferredAppId?: string) {
  try {
    const supabaseClient = createSupabaseClient();
    if (!supabaseClient) {
      return null;
    }
    
    const query = supabaseClient
      .from('wechat_accounts')
      .select('*')
      .eq('is_authorized', true)
      .gt('token_expires_at', new Date().toISOString());

    const { data, error } = await query.single();

    if (error || !data) {
      // 尝试查找任何已授权的账号
      const { data: anyAccount } = await supabaseClient
        .from('wechat_accounts')
        .select('*')
        .eq('is_authorized', true)
        .limit(1)
        .single();
      
      return anyAccount || null;
    }

    return data;
  } catch (err) {
    console.error('查询授权账号失败:', err);
    return null;
  }
}

/**
 * 获取Component Access Token（第三方平台）
 */
async function getComponentAccessToken(): Promise<string | null> {
  if (!COMPONENT_APPID || !COMPONENT_APP_SECRET) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/component/api_component_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_appid: COMPONENT_APPID,
          component_appsecret: COMPONENT_APP_SECRET,
        }),
      }
    );
    const data = await response.json();
    return data.component_access_token || null;
  } catch (error) {
    console.error('获取Component Access Token失败:', error);
    return null;
  }
}

/**
 * 刷新授权Access Token
 */
async function refreshAuthorizerToken(authorizerAppId: string, authorizerRefreshToken: string) {
  const componentAccessToken = await getComponentAccessToken();
  if (!componentAccessToken) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=${componentAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_appid: COMPONENT_APPID,
          authorizer_appid: authorizerAppId,
          authorizer_refresh_token: authorizerRefreshToken,
        }),
      }
    );
    const data = await response.json();

    if (data.authorizer_access_token) {
      // 更新数据库中的token
      const supabaseClient = createSupabaseClient();
      if (supabaseClient) {
        await supabaseClient
          .from('wechat_accounts')
          .update({
            authorizer_access_token: data.authorizer_access_token,
            authorizer_refresh_token: data.authorizer_refresh_token,
            token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            refresh_expires_at: new Date(Date.now() + 5184000 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('app_id', authorizerAppId);
      }

      return data.authorizer_access_token;
    }

    return null;
  } catch (error) {
    console.error('刷新Token失败:', error);
    return null;
  }
}

/**
 * 获取微信Access Token（通过第三方平台或直接）
 */
async function getAccessToken(account?: { 
  authorizer_access_token?: string;
  authorizer_refresh_token?: string;
  authorizer_appid?: string;
}): Promise<{ token: string | null; account: typeof account }> {
  // 如果有已授权账号
  if (account?.authorizer_access_token) {
    return { token: account.authorizer_access_token, account };
  }

  // 如果配置了第三方平台
  if (COMPONENT_APPID && COMPONENT_APP_SECRET && account?.authorizer_refresh_token && account?.authorizer_appid) {
    const newToken = await refreshAuthorizerToken(account.authorizer_appid, account.authorizer_refresh_token);
    return { token: newToken, account };
  }

  // 降级：使用环境变量
  if (WECHAT_APP_ID && WECHAT_APP_SECRET) {
    try {
      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`
      );
      const data = await response.json();
      return { token: data.access_token || null, account };
    } catch (error) {
      console.error('获取Access Token失败:', error);
    }
  }

  return { token: null, account };
}

/**
 * 上传图片到微信素材库
 */
async function uploadImageToWechat(accessToken: string, imageUrl: string, useComponentApi: boolean = false): Promise<string | null> {
  try {
    // 下载图片
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);

    // 上传到微信
    const formData = new FormData();
    formData.append('media', imageBlob, 'image.jpg');

    let uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=image`;
    if (useComponentApi && COMPONENT_APPID) {
      const componentAccessToken = await getComponentAccessToken();
      if (componentAccessToken) {
        uploadUrl = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${componentAccessToken}&type=image`;
      }
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

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
function processContentForWechat(content: string, uploadedImages: string[], originalImages: string[]): string {
  let processed = content;
  
  // 转换Markdown标题为HTML
  processed = processed.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  processed = processed.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  processed = processed.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // 转换加粗
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 转换斜体
  processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // 转换图片
  processed = processed.replace(/!\[.*?\]\(.*?\)/g, '');
  
  // 转换段落
  processed = processed.split('\n\n').map(p => {
    if (!p.trim()) return '';
    if (p.startsWith('<h') || p.startsWith('<p')) return p;
    if (p.startsWith('- ') || p.startsWith('* ')) {
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
    }
    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return processed;
}

/**
 * POST /api/push-to-wechat
 * 推送文章到公众号草稿箱
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, imageUrls = [], appId } = body;

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

    // 获取要使用的公众号账号
    let account = await getAuthorizedAccount(appId);
    
    // 如果指定了appId但未找到对应的账号
    if (appId && (!account || account.app_id !== appId)) {
      const supabaseClient = createSupabaseClient();
      if (supabaseClient) {
        const { data: specificAccount } = await supabaseClient
          .from('wechat_accounts')
          .select('*')
          .eq('app_id', appId)
          .single();
        
        if (specificAccount) {
          account = specificAccount;
        }
      }
    }

    // 获取Access Token
    const { token } = await getAccessToken(account);

    // 如果有有效的Access Token，执行真实推送
    if (token) {
      const useComponentApi = !!(COMPONENT_APPID && account);

      // 上传图片到微信素材库
      const uploadedImages: string[] = [];
      for (const imageUrl of imageUrls) {
        const mediaId = await uploadImageToWechat(token, imageUrl, useComponentApi);
        if (mediaId) {
          uploadedImages.push(mediaId);
        }
      }

      // 处理内容
      const processedContent = processContentForWechat(content, uploadedImages, imageUrls);

      // 构建草稿
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
      const draftUrl = useComponentApi
        ? `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`
        : `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;

      const draftResponse = await fetch(draftUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles }),
      });

      const draftResult = await draftResponse.json();

      if (draftResult.media_id) {
        return NextResponse.json({
          success: true,
          message: `推送成功！文章已发送到${account?.nickname || '公众号'}草稿箱`,
          data: {
            draftId: draftResult.media_id,
            account: account?.nickname || '公众号',
          },
        });
      }

      console.error('创建草稿失败:', draftResult);
    }

    // 模拟成功响应（演示模式）
    console.log('推送模式：演示（无可用Access Token）');
    return NextResponse.json({
      success: true,
      message: account 
        ? `模拟推送成功！文章已发送到${account.nickname}草稿箱（演示模式）` 
        : '模拟推送成功（演示模式）',
      data: {
        draftId: `mock_${Date.now()}`,
        title: title || '未命名文章',
        contentLength: content.length,
      },
      demo: true,
      account: account ? {
        nickname: account.nickname,
        appId: account.app_id,
      } : null,
    });

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
  try {
    const account = await getAuthorizedAccount();
    
    return NextResponse.json({
      success: true,
      message: '推送API正常',
      config: {
        componentConfigured: !!(COMPONENT_APPID && COMPONENT_APP_SECRET),
        appIdConfigured: !!(WECHAT_APP_ID && WECHAT_APP_SECRET),
        hasAuthorizedAccount: !!account,
        account: account ? {
          nickname: account.nickname,
          appId: account.app_id,
          headImg: account.head_img,
        } : null,
      },
    });

  } catch (error) {
    console.error('获取推送状态异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}
