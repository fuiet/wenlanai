import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// 生成6位数字验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// 发送邮箱验证码
export async function POST(request: NextRequest) {
  try {
    const { email, type = 'register' } = await request.json();

    // 参数验证
    if (!email) {
      return NextResponse.json({ success: false, message: '请输入邮箱地址' }, { status: 400 });
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: '邮箱格式不正确' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      // 演示模式：直接返回成功
      const code = generateCode();
      console.log(`[演示模式] 邮箱验证码: ${code}`);
      return NextResponse.json({
        success: true,
        message: '验证码已发送（演示模式）',
        code,
        expiresIn: 600
      });
    }

    // 限制发送频率：同一邮箱1分钟内只能发送一次
    const { data: recentCode } = await supabase
      .from('email_codes')
      .select('*')
      .eq('email', email)
      .eq('type', type)
      .gte('created_at', new Date(Date.now() - 60000).toISOString())
      .limit(1)
      .single();

    if (recentCode) {
      const remainingSeconds = 60 - Math.floor((Date.now() - new Date(recentCode.created_at).getTime()) / 1000);
      return NextResponse.json({ 
        success: false, 
        message: `请${remainingSeconds}秒后再试` 
      }, { status: 429 });
    }

    // 生成验证码
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效期

    // 保存验证码到数据库
    const { error: insertError } = await supabase
      .from('email_codes')
      .insert({
        email,
        code,
        type,
        used: false,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('保存邮箱验证码失败:', insertError);
      return NextResponse.json({ success: false, message: '发送失败，请稍后重试' }, { status: 500 });
    }

    // 发送邮件（这里使用日志记录，实际项目中需要接入邮件服务）
    console.log(`[邮箱验证码] 发送至: ${email}, 验证码: ${code}, 类型: ${type}`);
    
    // 实际项目中需要接入邮件发送服务，例如：
    // await sendEmail({
    //   to: email,
    //   subject: '【文澜智作】您的注册验证码',
    //   html: `您的验证码是：<b>${code}</b>，10分钟内有效。`
    // });

    // 演示模式：返回验证码（仅开发环境使用）
    const isDev = process.env.NODE_ENV === 'development';
    
    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      ...(isDev && { code }), // 开发环境返回验证码方便测试
      expiresIn: 600
    });

  } catch (error) {
    console.error('发送邮箱验证码失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
