import { NextResponse } from 'next/server';

/**
 * 获取 component_verify_ticket 状态
 */

const createSupabaseClient = () => {
  const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function GET() {
  try {
    const supabaseClient = createSupabaseClient();
    
    if (!supabaseClient) {
      return NextResponse.json({
        success: false,
        message: '数据库未配置',
      });
    }

    // 获取 ticket
    const { data } = await supabaseClient
      .from('wechat_config')
      .select('config_value, updated_at')
      .eq('config_key', 'component_ticket')
      .single();

    if (!data) {
      return NextResponse.json({
        success: false,
        message: '未收到 ticket，请确认微信后台配置正确',
      });
    }

    const ticketData = typeof data.config_value === 'string' 
      ? JSON.parse(data.config_value) 
      : data.config_value;

    return NextResponse.json({
      success: true,
      ticket: ticketData.ticket,
      receivedAt: ticketData.receivedAt,
      updatedAt: data.updated_at,
    });

  } catch (error) {
    console.error('获取 ticket 失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取 ticket 失败',
    });
  }
}
