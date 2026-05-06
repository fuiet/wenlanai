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
 * 从数据库获取第三方平台配置
 */
async function getComponentConfig() {
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    return null;
  }
  
  try {
    const { data } = await supabaseClient
      .from('wechat_config')
      .select('config_value')
      .eq('config_key', 'component')
      .single();
    
    if (data?.config_value) {
      return JSON.parse(data.config_value);
    }
  } catch (error) {
    console.error('获取第三方平台配置失败:', error);
  }
  
  return null;
}

/**
 * 从数据库获取已授权的公众号
 */
async function getAuthorizedAccount(appId?: string) {
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    return null;
  }
  
  try {
    let query = supabaseClient
      .from('wechat_accounts')
      .select('*')
      .eq('is_authorized', true);

    if (appId) {
      query = query.eq('app_id', appId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      // 如果没找到指定账号，返回任意一个已授权的账号
      if (!appId) {
        const { data: anyAccount } = await supabaseClient
          .from('wechat_accounts')
          .select('*')
          .eq('is_authorized', true)
          .limit(1)
          .single();
        return anyAccount || null;
      }
      return null;
    }

    return data;
  } catch (err) {
    console.error('查询授权账号失败:', err);
    return null;
  }
}

/**
 * 获取Component Access Token
 */
async function getComponentAccessToken(config: { appId: string; appSecret: string }): Promise<string | null> {
  try {
    const response = await fetch(
      'https://api.weixin.qq.com/cgi-bin/component/api_component_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_appid: config.appId,
          component_appsecret: config.appSecret,
        }),
      }
    );
    const data = await response.json();

    if (data.errcode) {
      console.error('获取component_access_token失败:', data);
      return null;
    }

    return data.component_access_token;
  } catch (error) {
    console.error('获取Component Access Token异常:', error);
    return null;
  }
}

/**
 * 刷新授权Access Token
 */
async function refreshAuthorizerToken(
  config: { appId: string; appSecret: string },
  authorizerAppId: string,
  authorizerRefreshToken: string
): Promise<string | null> {
  const componentAccessToken = await getComponentAccessToken(config);
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
          component_appid: config.appId,
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
 * 获取Authorizer Access Token
 */
async function getAccessToken(
  config: { appId: string; appSecret: string },
  account?: { 
    authorizer_access_token?: string;
    authorizer_refresh_token?: string;
    authorizer_appid?: string;
    app_id?: string;
  }
): Promise<{ token: string | null; account: typeof account }> {
  // 如果有已授权账号的token
  if (account?.authorizer_access_token) {
    return { token: account.authorizer_access_token, account };
  }

  // 如果有refresh_token，尝试刷新
  if (account?.authorizer_refresh_token && account?.authorizer_appid) {
    const newToken = await refreshAuthorizerToken(
      config,
      account.authorizer_appid,
      account.authorizer_refresh_token
    );
    if (newToken) {
      return { token: newToken, account };
    }
  }

  return { token: null, account };
}

/**
 * 上传图片到微信素材库
 */
async function uploadImageToWechat(
  accessToken: string,
  imageUrl: string
): Promise<string | null> {
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
 * 将Markdown内容转换为微信文章格式（保留丰富排版）
 */
function processContentForWechat(content: string): string {
  let processed = content;
  
  // 1. 处理分隔线（需要放在标题之前）
  processed = processed.replace(/^---$/gim, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>');
  
  // 2. 处理引用块（> 开头的内容）
  // 将连续的引用行合并为一个blockquote
  const quoteBlockRegex = /^(&gt;\s?[^\n]*(?:\n(?:&gt;|\s*$)[^\n]*)*)/gim;
  processed = processed.replace(quoteBlockRegex, (match) => {
    const text = match.replace(/^&gt;\s?/gim, '').replace(/\n&gt;\s?/g, '<br/>').replace(/^&gt;/g, '').replace(/&gt;/g, '');
    return `<blockquote style="margin:16px 0;padding:12px 16px;background:#fef9f3;border-left:4px solid #f59e0b;font-style:italic;color:#78716c;">${text}</blockquote>`;
  });
  
  // 3. 转换Markdown标题为HTML（带样式）
  processed = processed.replace(/^### (.*$)/gim, '<h3 style="font-size:18px;font-weight:600;margin:20px 0 12px;color:#ea580c;border-left:3px solid #f59e0b;padding-left:12px;">$1</h3>');
  processed = processed.replace(/^## (.*$)/gim, '<h2 style="font-size:20px;font-weight:700;margin:24px 0 16px;padding-bottom:8px;border-bottom:2px solid #f59e0b;">📌 $1</h2>');
  processed = processed.replace(/^# (.*$)/gim, '<h1 style="font-size:24px;font-weight:800;text-align:center;margin:24px 0;background:linear-gradient(135deg,#f59e0b,#ea580c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">$1</h1>');
  
  // 4. 转换加粗和斜体
  processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ea580c;">$1</strong>');
  processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // 5. 转换图片语法为空（因为图片会单独上传到素材库）
  processed = processed.replace(/!\[.*?\]\(.*?\)/g, '');
  
  // 6. 处理无序列表（- 开头）
  const ulLines: string[] = [];
  const result: string[] = [];
  const lines = processed.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^[\-\*]\s/)) {
      ulLines.push(line.replace(/^[\-\*]\s/, ''));
    } else {
      if (ulLines.length > 0) {
        // 生成无序列表HTML
        const ulItems = ulLines.map(item => `<li style="margin:8px 0;padding-left:8px;">${item}</li>`).join('');
        result.push(`<ul style="margin:12px 0;padding-left:24px;color:#374151;">${ulItems}</ul>`);
        ulLines.length = 0;
      }
      result.push(line);
    }
  }
  // 处理末尾的列表
  if (ulLines.length > 0) {
    const ulItems = ulLines.map(item => `<li style="margin:8px 0;padding-left:8px;">${item}</li>`).join('');
    result.push(`<ul style="margin:12px 0;padding-left:24px;color:#374151;">${ulItems}</ul>`);
  }
  processed = result.join('\n');
  
  // 7. 处理有序列表（数字. 开头）
  const olLines: string[] = [];
  const result2: string[] = [];
  const lines2 = processed.split('\n');
  
  for (let i = 0; i < lines2.length; i++) {
    const line = lines2[i];
    if (line.match(/^\d+\.\s/)) {
      olLines.push(line.replace(/^\d+\.\s/, ''));
    } else {
      if (olLines.length > 0) {
        const olItems = olLines.map((item, idx) => 
          `<li style="margin:8px 0;padding-left:8px;list-style:none;counter-increment:item;"><span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;border-radius:50%;font-size:12px;margin-right:8px;font-weight:bold;">${idx + 1}</span>${item}</li>`
        ).join('');
        result2.push(`<ol style="margin:12px 0;padding-left:8px;color:#374151;counter-reset:item;">${olItems}</ol>`);
        olLines.length = 0;
      }
      result2.push(line);
    }
  }
  if (olLines.length > 0) {
    const olItems = olLines.map((item, idx) => 
      `<li style="margin:8px 0;padding-left:8px;list-style:none;counter-increment:item;"><span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;border-radius:50%;font-size:12px;margin-right:8px;font-weight:bold;">${idx + 1}</span>${item}</li>`
    ).join('');
    result2.push(`<ol style="margin:12px 0;padding-left:8px;color:#374151;counter-reset:item;">${olItems}</ol>`);
  }
  processed = result2.join('\n');
  
  // 8. 转换段落（处理剩余的普通文本行）
  const paraLines = processed.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) return trimmed;
    if (trimmed.match(/^[\-\*]\s/)) return trimmed; // 跳过已处理的列表
    return `<p style="margin:12px 0;line-height:1.8;">${trimmed}</p>`;
  }).join('');
  
  return paraLines;
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

    // 获取第三方平台配置
    const config = await getComponentConfig();
    
    // 获取要使用的公众号账号
    let account = await getAuthorizedAccount(appId);
    
    // 如果指定了appId但未找到对应的账号
    if (appId && (!account || account.app_id !== appId)) {
      account = await getAuthorizedAccount(appId);
    }

    // 如果有第三方平台配置和已授权账号，执行真实推送
    if (config?.appId && config?.appSecret && account) {
      // 获取Access Token
      const { token } = await getAccessToken(config, account);

      if (token) {
        // 上传图片到微信素材库
        const uploadedImages: string[] = [];
        for (const imageUrl of imageUrls) {
          const mediaId = await uploadImageToWechat(token, imageUrl);
          if (mediaId) {
            uploadedImages.push(mediaId);
          }
        }

        // 处理内容
        const processedContent = processContentForWechat(content);

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
        const draftUrl = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;

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
        
        // 如果API调用失败，返回具体错误
        if (draftResult.errcode) {
          return NextResponse.json({
            success: false,
            message: `微信API错误：${draftResult.errmsg || '创建草稿失败'}`,
            error: draftResult,
          });
        }
      }
    }

    // 如果没有配置，返回提示
    if (!config?.appId || !config?.appSecret) {
      return NextResponse.json({
        success: false,
        message: '请先配置微信第三方平台',
        requireConfig: true,
      });
    }

    // 如果没有已授权的公众号
    if (!account) {
      return NextResponse.json({
        success: false,
        message: '请先绑定公众号',
        requireAuth: true,
      });
    }

    // 其他错误
    return NextResponse.json({
      success: false,
      message: '推送失败，请稍后重试',
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
    const config = await getComponentConfig();
    const account = await getAuthorizedAccount();
    
    return NextResponse.json({
      success: true,
      message: '推送API正常',
      config: {
        componentConfigured: !!(config?.appId && config?.appSecret),
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
