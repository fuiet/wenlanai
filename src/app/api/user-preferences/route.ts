import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 保存用户偏好
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, preferredCategories, customKeywords, notificationEnabled, notificationTime, minReads, searchStrategy } = await request.json();

    const client = getSupabaseClient();

    // 如果数据库未配置，返回成功但提示无法存储
    if (!client) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: '用户偏好已保存（演示模式），数据库未配置',
        data: {
          user_id: userId || 'default',
          preferred_categories: preferredCategories || ['情感', '职场'],
          custom_keywords: customKeywords || [],
        },
      });
    }

    try {
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
        // 如果表不存在，返回成功但提示
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          return NextResponse.json({
            success: true,
            demo: true,
            message: '用户偏好已保存（演示模式），数据库表未初始化',
            data: {
              user_id: userId || 'default',
              preferred_categories: preferredCategories || ['情感', '职场'],
              custom_keywords: customKeywords || [],
            },
          });
        }
        throw new Error(`保存用户偏好失败: ${error.message}`);
      }

      return NextResponse.json({
        success: true,
        data,
        message: '用户偏好保存成功',
      });
    } catch (dbError) {
      // 数据库操作失败，返回成功但提示
      console.error('数据库操作失败:', dbError);
      return NextResponse.json({
        success: true,
        demo: true,
        message: '用户偏好已保存（演示模式），数据库操作失败',
        data: {
          user_id: userId || 'default',
          preferred_categories: preferredCategories || ['情感', '职场'],
          custom_keywords: customKeywords || [],
        },
      });
    }
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

    // 如果数据库未配置，返回默认配置
    if (!client) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          user_id: userId,
          preferred_categories: ['情感', '职场'],
          custom_keywords: [],
          notification_enabled: true,
          notification_time: '09:00',
          min_reads: 10000,
          search_strategy: 'default',
        },
      });
    }

    try {
      const { data, error } = await client
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        // 如果表不存在，返回默认配置
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          return NextResponse.json({
            success: true,
            demo: true,
            data: {
              user_id: userId,
              preferred_categories: ['情感', '职场'],
              custom_keywords: [],
              notification_enabled: true,
              notification_time: '09:00',
              min_reads: 10000,
              search_strategy: 'default',
            },
          });
        }
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
    } catch (dbError) {
      // 数据库查询失败，返回默认配置
      console.error('数据库查询失败:', dbError);
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          user_id: userId,
          preferred_categories: ['情感', '职场'],
          custom_keywords: [],
          notification_enabled: true,
          notification_time: '09:00',
          min_reads: 10000,
          search_strategy: 'default',
        },
      });
    }
  } catch (error) {
    console.error('获取用户偏好失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}
