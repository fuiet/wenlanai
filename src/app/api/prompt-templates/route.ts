import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取提示词模板失败:', error);
      return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      templates: data || []
    });
  } catch (error) {
    console.error('获取提示词模板失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
