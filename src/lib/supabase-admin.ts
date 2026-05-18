import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;
let initialized = false;

// 延迟初始化 Supabase 客户端，避免未配置环境变量时在模块加载阶段抛错。
function initSupabase() {
  if (initialized) return;
  initialized = true;

  const supabaseUrl = process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseKey);
  }
}

// 管理员权限的 Supabase 客户端
export function getSupabaseAdmin(): SupabaseClient | null {
  initSupabase();
  if (!supabaseAdminInstance) {
    console.warn('Supabase配置缺失');
  }
  return supabaseAdminInstance;
}

// 导出实例代理（未配置时方法访问返回 undefined，保持演示模式兼容）。
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    initSupabase();
    if (supabaseAdminInstance) {
      return Reflect.get(supabaseAdminInstance, prop, supabaseAdminInstance);
    }
    return undefined;
  }
});
