#!/usr/bin/env node
/**
 * 腾讯云短信服务工具
 * 直接调用腾讯云API，无需SDK
 */

// 从环境变量获取配置
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID || "";
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY || "";
const TENCENT_SMS_APPID = process.env.TENCENT_SMS_APPID || "";  // SDKAppId
const TENCENT_SMS_TEMPLATE_ID = process.env.TENCENT_SMS_TEMPLATE_ID || "";
const TENCENT_SMS_SIGN_NAME = process.env.TENCENT_SMS_SIGN_NAME || "";

/**
 * 生成腾讯云API签名
 */
async function generateSignature(params: Record<string, string>, secretKey: string) {
  const crypto = await import('crypto');
  const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
    if (params[key] !== undefined && params[key] !== '') {
      acc[key] = params[key];
    }
    return acc;
  }, {} as Record<string, string>);
  
  const signStr = Object.entries(sortedParams)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  
  const hmac = crypto.createHmac('sha1', secretKey);
  return hmac.update(signStr).digest('base64');
}

/**
 * 发送短信验证码
 */
async function sendSmsCode(phoneNumber: string, code: string): Promise<{
  success: boolean;
  message: string;
  demo?: boolean;
  messageId?: string;
}> {
  // 检查配置是否完整
  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY || 
      !TENCENT_SMS_APPID || !TENCENT_SMS_TEMPLATE_ID || !TENCENT_SMS_SIGN_NAME) {
    console.log("[SMS] 配置不完整，使用演示模式");
    return {
      success: true,
      message: "演示模式：验证码为 " + code,
      demo: true
    };
  }

  try {
    const crypto = await import('crypto');
    
    // 生成时间戳和随机数
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // API参数
    const params: Record<string, string> = {
      Action: 'SendSms',
      Version: '2021-01-11',
      Region: 'ap-guangzhou',
      SmsSdkAppId: TENCENT_SMS_APPID,
      SignName: TENCENT_SMS_SIGN_NAME,
      TemplateId: TENCENT_SMS_TEMPLATE_ID,
      TemplateParamSet: `["${code}","5"]`,
      PhoneNumberSet: `["${phoneNumber}"]`,
      Timestamp: timestamp,
      Nonce: nonce,
      SecretId: TENCENT_SECRET_ID,
    };

    // 生成签名
    const signature = await generateSignature(params, TENCENT_SECRET_KEY);
    params.Signature = signature;

    console.log("[SMS] 发送短信到:", phoneNumber);

    // 发送请求
    const url = new URL('https://sms.tencentcosapi.com');
    url.search = new URLSearchParams(params).toString();

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    const data = await response.json() as { Response?: { SendStatusSet?: Array<{ Code: string; Message: string; MessageId?: string }> } };
    
    console.log("[SMS] 发送结果:", JSON.stringify(data));

    // 检查发送结果
    if (data.Response && data.Response.SendStatusSet && data.Response.SendStatusSet.length > 0) {
      const status = data.Response.SendStatusSet[0];
      if (status.Code === "Ok") {
        return {
          success: true,
          message: "短信发送成功",
          messageId: status.MessageId
        };
      } else {
        return {
          success: false,
          message: "发送失败: " + status.Message
        };
      }
    }

    return {
      success: true,
      message: "短信发送成功"
    };

  } catch (error) {
    const err = error as Error;
    console.error("[SMS] 发送失败:", err.message);
    return {
      success: false,
      message: "发送失败: " + err.message
    };
  }
}

/**
 * 验证配置是否正确
 */
function checkConfig() {
  const missing: string[] = [];
  if (!TENCENT_SECRET_ID) missing.push("TENCENT_SECRET_ID");
  if (!TENCENT_SECRET_KEY) missing.push("TENCENT_SECRET_KEY");
  if (!TENCENT_SMS_APPID) missing.push("TENCENT_SMS_APPID");
  if (!TENCENT_SMS_TEMPLATE_ID) missing.push("TENCENT_SMS_TEMPLATE_ID");
  if (!TENCENT_SMS_SIGN_NAME) missing.push("TENCENT_SMS_SIGN_NAME");

  if (missing.length > 0) {
    return {
      valid: false,
      missing
    };
  }

  return {
    valid: true
  };
}

export { sendSmsCode, checkConfig };
