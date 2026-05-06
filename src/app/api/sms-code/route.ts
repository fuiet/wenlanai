import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendSmsCode, checkConfig } from "@/lib/sms";
import { v4 as uuidv4 } from "uuid";

// 生成6位验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 验证手机号格式
function validatePhone(phone: string): { valid: boolean; formatted: string | null } {
  // 支持格式：13800138000 或 +8613800138000 或 86-138-0013-8000
  let cleaned = phone.replace(/[\s\-]/g, "");
  
  // 如果以+86开头，去掉+
  if (cleaned.startsWith("+86")) {
    cleaned = cleaned.substring(3);
  }
  
  // 如果以86开头，去掉86
  if (cleaned.startsWith("86") && cleaned.length === 13) {
    cleaned = cleaned.substring(2);
  }
  
  // 验证是否为11位数字
  if (/^1[3-9]\d{9}$/.test(cleaned)) {
    return { valid: true, formatted: "+86" + cleaned };
  }
  
  return { valid: false, formatted: null };
}

// 发送验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, type = "register" } = body;

    // 验证手机号
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { success: false, message: "手机号格式不正确" },
        { status: 400 }
      );
    }

    const formattedPhone = phoneValidation.formatted!;

    // 检查腾讯云配置
    const configStatus = checkConfig();
    if (!configStatus.configured) {
      console.log("[SMS-API] 腾讯云短信未配置，使用演示模式");
    }

    // 生成验证码
    const code = generateCode();
    
    // 发送到腾讯云短信
    const result = await sendSmsCode(formattedPhone, code);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

    // 如果是演示模式，直接返回验证码（方便测试）
    if (result.demo) {
      return NextResponse.json({
        success: true,
        message: "演示模式：验证码为 " + code,
        demo: true,
        code: code // 演示模式下返回验证码
      });
    }

    // 保存验证码到数据库
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效期

    // 删除该手机号之前的验证码
    await supabase
      .from("sms_codes")
      .delete()
      .eq("phone", formattedPhone)
      .eq("used", false);

    // 保存新验证码
    const { error } = await supabase.from("sms_codes").insert({
      phone: formattedPhone,
      code: code,
      type: type,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("[SMS-API] 保存验证码失败:", error);
      return NextResponse.json(
        { success: false, message: "保存验证码失败" },
        { status: 500 }
      );
    }

    console.log("[SMS-API] 验证码已发送:", formattedPhone, "验证码:", code);

    return NextResponse.json({
      success: true,
      message: "验证码已发送"
    });

  } catch (error) {
    console.error("[SMS-API] 错误:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}

// 获取发送状态
export async function GET() {
  const configStatus = checkConfig();
  return NextResponse.json({
    success: true,
    configured: configStatus.configured,
    missing: configStatus.missing || []
  });
}
