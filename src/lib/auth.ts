import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase-admin';

export const COOKIE_NAME = 'wenlan_session';

export async function createSession(userId: string, request?: Request): Promise<string> {
  const sessionId = uuidv4();
  const supabase = getSupabaseAdmin();
  
  // 存储session到数据库
  await supabase.from('user_sessions').insert({
    user_id: userId,
    session_id: sessionId,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天有效期
  });
  
  // 设置cookie（仅在服务端上下文可用时）
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });
  } catch {
    // 在某些上下文中无法访问cookie（如API路由的流式响应）
    // session已存储到数据库，客户端会通过响应头获取
  }
  
  return sessionId;
}

export async function verifySession(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!sessionId) {
    return null;
  }
  
  const supabase = getSupabaseAdmin();
  const { data: session } = await supabase
    .from('user_sessions')
    .select('user_id, expires_at')
    .eq('session_id', sessionId)
    .single();
  
  if (!session) {
    return null;
  }
  
  // 检查是否过期
  if (new Date(session.expires_at) < new Date()) {
    // 删除过期session
    await supabase.from('user_sessions').delete().eq('session_id', sessionId);
    return null;
  }
  
  return session.user_id;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;
  
  if (sessionId) {
    const supabase = getSupabaseAdmin();
    await supabase.from('user_sessions').delete().eq('session_id', sessionId);
  }
  
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<{ id: string; phone: string; nickname?: string } | null> {
  const userId = await verifySession();
  
  if (!userId) {
    return null;
  }
  
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from('users')
    .select('id, phone, nickname')
    .eq('id', userId)
    .single();
  
  return user;
}
