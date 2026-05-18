import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;
let initialized = false;

// 延迟初始化 Supabase 客户端
function initSupabase() {
  if (initialized) return;
  initialized = true;
  
  const supabaseUrl = process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && supabaseKey) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseKey);
  }
}

// 管理员权限的Supabase客户端
export function getSupabaseAdmin(): SupabaseClient | null {
  initSupabase();
  if (!supabaseAdminInstance) {
    console.warn('Supabase配置缺失');
  }
  return supabaseAdminInstance;
}

// 导出实例（可能为null）
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    initSupabase();
    if (supabaseAdminInstance) {
      return Reflect.get(supabaseAdminInstance, prop, supabaseAdminInstance);
    }
    return undefined;
  }
});
