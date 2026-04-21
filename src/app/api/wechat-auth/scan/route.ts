import { NextRequest, NextResponse } from 'next/server';

// 初始化Supabase客户端（延迟初始化）
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey);
}

// 内存存储授权码（生产环境应使用Redis）
const authCodes = new Map<string, {
  code: string;
  appId?: string;
  appSecret?: string;
  nickname?: string;
  createdAt: number;
  expiresIn: number; // 有效期（秒）
  status: 'pending' | 'completed' | 'expired';
}>();

// 清理过期授权码
function cleanExpiredCodes() {
  const now = Date.now();
  for (const [key, value] of authCodes.entries()) {
    if (now - value.createdAt > value.expiresIn * 1000) {
      authCodes.delete(key);
    }
  }
}

// 生成6位数字授权码
function generateAuthCode(): string {
  return Math.random().toString().slice(2, 8).padStart(6, '0');
}

// 获取或创建授权码
function getOrCreateAuthCode(sessionId: string) {
  cleanExpiredCodes();
  
  const existing = authCodes.get(sessionId);
  if (existing && existing.status === 'pending' && Date.now() - existing.createdAt < existing.expiresIn * 1000) {
    return existing;
  }
  
  const code = generateAuthCode();
  const authData = {
    code,
    createdAt: Date.now(),
    expiresIn: 600, // 10分钟有效期
    status: 'pending' as const,
  };
  
  authCodes.set(sessionId, authData);
  return authData;
}

/**
 * POST /api/wechat-auth/scan
 * 生成授权码和二维码
 */
export async function POST(request: NextRequest) {
  try {
    // 生成会话ID
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // 获取授权码
    const authData = getOrCreateAuthCode(sessionId);
    
    // 生成二维码URL（扫码后跳转到授权页面）
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const authPageUrl = `${baseUrl}/account/scan-auth?session=${sessionId}&code=${authData.code}`;
    
    // 生成二维码图片
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const QRCode = require('qrcode');
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(authPageUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (qrError) {
      console.error('生成二维码失败:', qrError);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        authCode: authData.code,
        expiresIn: authData.expiresIn,
        expiresAt: new Date(authData.createdAt + authData.expiresIn * 1000).toISOString(),
        qrCodeUrl: qrCodeDataUrl,
        authPageUrl,
      },
    });
    
  } catch (error) {
    console.error('生成授权码异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wechat-auth/scan
 * 查询授权码状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: '缺少sessionId' },
        { status: 400 }
      );
    }
    
    const authData = authCodes.get(sessionId);
    
    if (!authData) {
      return NextResponse.json({
        success: false,
        message: '授权码不存在或已过期',
        expired: true,
      });
    }
    
    // 检查是否过期
    const now = Date.now();
    if (now - authData.createdAt > authData.expiresIn * 1000) {
      authCodes.delete(sessionId);
      return NextResponse.json({
        success: false,
        message: '授权码已过期，请重新扫码',
        expired: true,
      });
    }
    
    // 获取剩余时间
    const remainingSeconds = Math.max(0, Math.ceil((authData.expiresIn * 1000 - (now - authData.createdAt)) / 1000));
    
    return NextResponse.json({
      success: true,
      data: {
        status: authData.status,
        authCode: authData.code,
        remainingSeconds,
        appId: authData.appId,
        nickname: authData.nickname,
      },
    });
    
  } catch (error) {
    console.error('查询授权状态异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常' },
      { status: 500 }
    );
  }
}
