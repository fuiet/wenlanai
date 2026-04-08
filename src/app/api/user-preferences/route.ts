import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 保存用户偏好
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, preferredCategories, customKeywords, notificationEnabled, notificationTime, minReads, searchStrategy } = await request.json();

    const client = getSupabaseClient();

    const { data, error } = await client
      .from('user_preferences')
      .upsert(
        {
          user_id: userId || 'default',
          preferred_categories: preferredCategories || ['情感', '职场'],
          custom_keywords: customKeywords || [],
          notification_enabled: notificationEnabled !== undefined ? notificationEnabled : true,
          notification_time: notificationTime || '09:00',
          min_reads: minReads || 10000,
          search_strategy: searchStrategy || 'default',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`保存用户偏好失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: '用户偏好保存成功',
    });
  } catch (error) {
    console.error('保存用户偏好失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取用户偏好
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default';

    const client = getSupabaseClient();

    const { data, error } = await client
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`查询用户偏好失败: ${error.message}`);
    }

    // 如果没有找到用户偏好，返回默认配置
    const preferences = data || {
      user_id: userId,
      preferred_categories: ['情感', '职场'],
      custom_keywords: [],
      notification_enabled: true,
      notification_time: '09:00',
      min_reads: 10000,
      search_strategy: 'default',
    };

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('获取用户偏好失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}
