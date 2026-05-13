import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabaseAdminInstance = createClient(supabaseUrl, supabaseKey);
}

// 管理员权限的Supabase客户端
export function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    console.warn('Supabase配置缺失，返回null');
    return null;
  }
  return supabaseAdminInstance;
}

// 导出可能为null的实例，用于需要直接访问的场景
export const supabaseAdmin = supabaseAdminInstance;
