import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// 模拟存储验证码（生产环境应使用Redis）
const codeStore = new Map<string, { code: string; expires: number }>();

// 生成6位验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送验证码API
export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ success: false, message: '请输入手机号' }, { status: 400 });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ success: false, message: '手机号格式不正确' }, { status: 400 });
    }

    // 生成验证码
    const code = generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟有效期

    // 存储验证码
    codeStore.set(phone, { code, expires: expiresAt });

    // TODO: 实际项目中应调用短信服务商API发送验证码
    // 这里模拟发送成功
    console.log(`[SMS] 发送验证码到 ${phone}: ${code}`);

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 开发环境返回验证码方便测试
      devCode: process.env.NODE_ENV === 'development' ? code : undefined
    });
  } catch (error) {
    console.error('[SMS Error]', error);
    return NextResponse.json({ success: false, message: '发送失败' }, { status: 500 });
  }
}

// 验证验证码API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const code = searchParams.get('code');

    if (!phone || !code) {
      return NextResponse.json({ success: false, message: '参数不完整' }, { status: 400 });
    }

    const stored = codeStore.get(phone);

    if (!stored) {
      return NextResponse.json({ success: false, message: '请先获取验证码' }, { status: 400 });
    }

    if (Date.now() > stored.expires) {
      codeStore.delete(phone);
      return NextResponse.json({ success: false, message: '验证码已过期' }, { status: 400 });
    }

    if (stored.code !== code) {
      return NextResponse.json({ success: false, message: '验证码错误' }, { status: 400 });
    }

    // 验证成功后删除验证码
    codeStore.delete(phone);

    return NextResponse.json({ success: true, message: '验证成功' });
  } catch (error) {
    console.error('[SMS Verify Error]', error);
    return NextResponse.json({ success: false, message: '验证失败' }, { status: 500 });
  }
}
