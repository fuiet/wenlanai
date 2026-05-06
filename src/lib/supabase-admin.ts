import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// 管理员权限的Supabase客户端
export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase配置缺失');
  }
  return supabaseAdmin;
}
