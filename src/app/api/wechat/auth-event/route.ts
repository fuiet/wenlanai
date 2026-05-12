import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * 微信授权事件接收URL
 * 
 * 用于接收微信推送的授权事件，包括：
 * - component_verify_ticket（每10分钟推送一次）
 * - 授权/取消授权事件
 */

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
};

/**
 * 解密微信消息
 */
function decryptMessage(encrypted: string, encodingAESKey: string): string | null {
  try {
    const key = Buffer.from(encodingAESKey + '=', 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, key.slice(0, 16));
    decipher.setAutoPadding(false);
    
    let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // 去除补位字符
    const pad = decrypted[decrypted.length - 1];
    decrypted = decrypted.slice(20, decrypted.length - pad);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
}

/**
 * 验证签名
 */
function verifySignature(signature: string, timestamp: string, nonce: string, token: string): boolean {
  const arr = [token, timestamp, nonce].sort();
  const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');
  return sha1 === signature;
}

/**
 * GET 请求 - 验证URL有效性
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const signature = searchParams.get('signature') || '';
  const timestamp = searchParams.get('timestamp') || '';
  const nonce = searchParams.get('nonce') || '';
  const echostr = searchParams.get('echostr') || '';

  // 获取配置的token
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    return new NextResponse('Database not configured', { status: 500 });
  }

  const { data: configData } = await supabaseClient
    .from('wechat_config')
    .select('config_value')
    .eq('config_key', 'component')
    .single();

  const config = configData?.config_value ? JSON.parse(configData.config_value) : {};
  const token = config.token || 'wenlan2024';

  // 验证签名
  if (verifySignature(signature, timestamp, nonce, token)) {
    return new NextResponse(echostr);
  }

  return new NextResponse('Invalid signature', { status: 403 });
}

/**
 * POST 请求 - 接收事件推送
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // 解析XML
    const xmlMatch = (str: string, tag: string): string => {
      const regex = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>|<${tag}>(.*?)</${tag}>`);
      const match = str.match(regex);
      return match ? (match[1] || match[2] || '') : '';
    };

    const encrypt = xmlMatch(body, 'Encrypt');
    const toUserName = xmlMatch(body, 'ToUserName');

    // 获取配置
    const supabaseClient = createSupabaseClient();
    if (!supabaseClient) {
      return new NextResponse('success');
    }

    const { data: configData } = await supabaseClient
      .from('wechat_config')
      .select('config_value')
      .eq('config_key', 'component')
      .single();

    const config = configData?.config_value ? JSON.parse(configData.config_value) : {};

    // 解密消息
    if (encrypt && config.encodingAESKey) {
      const decrypted = decryptMessage(encrypt, config.encodingAESKey);
      
      if (decrypted) {
        // 提取消息类型
        const infoType = xmlMatch(decrypted, 'InfoType');
        
        console.log('[微信事件] 类型:', infoType);

        // 处理 component_verify_ticket
        if (infoType === 'component_verify_ticket') {
          const ticket = xmlMatch(decrypted, 'ComponentVerifyTicket');
          
          // 保存ticket到数据库
          await supabaseClient
            .from('wechat_config')
            .upsert({
              config_key: 'component_ticket',
              config_value: JSON.stringify({
                ticket,
                receivedAt: new Date().toISOString(),
              }),
              updated_at: new Date().toISOString(),
            });

          console.log('[微信事件] 收到component_verify_ticket:', ticket);
        }

        // 处理授权事件
        if (infoType === 'authorized') {
          const authorizerAppid = xmlMatch(decrypted, 'AuthorizerAppid');
          const authorizationCode = xmlMatch(decrypted, 'AuthorizationCode');
          
          console.log('[微信事件] 公众号授权:', authorizerAppid, authorizationCode);
        }

        // 处理取消授权事件
        if (infoType === 'unauthorized') {
          const authorizerAppid = xmlMatch(decrypted, 'AuthorizerAppid');
          
          // 更新数据库中的授权状态
          await supabaseClient
            .from('wechat_accounts')
            .update({
              is_authorized: false,
              updated_at: new Date().toISOString(),
            })
            .eq('app_id', authorizerAppid);

          console.log('[微信事件] 公众号取消授权:', authorizerAppid);
        }

        // 处理刷新token事件
        if (infoType === 'updateauthorized') {
          const authorizerAppid = xmlMatch(decrypted, 'AuthorizerAppid');
          const authorizationCode = xmlMatch(decrypted, 'AuthorizationCode');
          
          console.log('[微信事件] 公众号更新授权:', authorizerAppid, authorizationCode);
        }
      }
    }

    // 必须返回success，否则微信会重试
    return new NextResponse('success');
    
  } catch (error) {
    console.error('[微信事件] 处理异常:', error);
    return new NextResponse('success');
  }
}
