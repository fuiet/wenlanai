#!/usr/bin/env node
/**
 * 腾讯云短信服务工具
 * 用于发送验证码短信
 */

const tencentcloud = require("tencentcloud-sdk-nodejs");
const SmsClient = tencentcloud.sms.v20210111.Client;

// 从环境变量获取配置
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID || "";
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY || "";
const TENCENT_SMS_APPID = process.env.TENCENT_SMS_APPID || "";  // SDKAppId
const TENCENT_SMS_TEMPLATE_ID = process.env.TENCENT_SMS_TEMPLATE_ID || "";
const TENCENT_SMS_SIGN_NAME = process.env.TENCENT_SMS_SIGN_NAME || "";

// 初始化客户端
let client = null;

function getClient() {
  if (!client && TENCENT_SECRET_ID && TENCENT_SECRET_KEY) {
    const clientConfig = {
      credential: {
        secretId: TENCENT_SECRET_ID,
        secretKey: TENCENT_SECRET_KEY,
      },
      region: "ap-guangzhou", // 广州区域
      profile: {
        httpProfile: {
          endpoint: "sms.tencentcosapi.com",
        },
      },
    };
    client = new SmsClient(clientConfig);
  }
  return client;
}

/**
 * 发送短信验证码
 * @param {string} phoneNumber - 手机号（格式：+86xxxxxxxxxxx）
 * @param {string} code - 验证码
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendSmsCode(phoneNumber, code) {
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
    const client = getClient();
    if (!client) {
      throw new Error("短信客户端初始化失败");
    }

    const params = {
      SmsSdkAppId: TENCENT_SMS_APPID,
      SignName: TENCENT_SMS_SIGN_NAME,
      TemplateId: TENCENT_SMS_TEMPLATE_ID,
      TemplateParamSet: [code, "5"], // 验证码和有效期（分钟）
      PhoneNumberSet: [phoneNumber],
    };

    console.log("[SMS] 发送短信到:", phoneNumber);
    
    const data = await client.SendSms(params);
    
    console.log("[SMS] 发送结果:", JSON.stringify(data));

    // 检查发送结果
    if (data.SendStatusSet && data.SendStatusSet.length > 0) {
      const status = data.SendStatusSet[0];
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
    console.error("[SMS] 发送失败:", error.message);
    return {
      success: false,
      message: "发送失败: " + error.message
    };
  }
}

/**
 * 验证配置是否正确
 */
function checkConfig() {
  const missing = [];
  if (!TENCENT_SECRET_ID) missing.push("TENCENT_SECRET_ID");
  if (!TENCENT_SECRET_KEY) missing.push("TENCENT_SECRET_KEY");
  if (!TENCENT_SMS_APPID) missing.push("TENCENT_SMS_APPID");
  if (!TENCENT_SMS_TEMPLATE_ID) missing.push("TENCENT_SMS_TEMPLATE_ID");
  if (!TENCENT_SMS_SIGN_NAME) missing.push("TENCENT_SMS_SIGN_NAME");

  if (missing.length > 0) {
    return {
      configured: false,
      missing: missing
    };
  }
  return { configured: true };
}

module.exports = {
  sendSmsCode,
  checkConfig
};
