import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;
let initialized = false;

// Supabase 表结构尚未生成类型文件，这里保留宽松客户端类型，避免未声明表被推断为 never。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseSupabaseClient = any;

let supabaseAdminInstance: LooseSupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabaseAdminInstance = createClient(supabaseUrl, supabaseKey);
}

// 管理员权限的Supabase客户端
export function getSupabaseAdmin(): LooseSupabaseClient | null {
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
