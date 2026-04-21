import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 创建定时任务
 */
export async function POST(request: NextRequest) {
  try {
    const { taskName, taskType, categories, scheduleTime, isActive = true } = await request.json();

    if (!taskName || !taskType || !scheduleTime) {
      return NextResponse.json(
        { error: '任务名称、任务类型和执行时间不能为空' },
        { status: 400 }
      );
    }

    // 验证时间格式 HH:mm
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduleTime)) {
      return NextResponse.json(
        { error: '时间格式不正确，请使用 HH:mm 格式（如 08:00）' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 如果数据库未配置，返回成功但跳过存储
    if (!client) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: '定时任务已创建（演示模式），数据库未配置',
        data: {
          id: Date.now(),
          task_name: taskName,
          task_type: taskType,
          schedule_time: scheduleTime,
          is_active: isActive,
        },
      });
    }

    // 计算下次执行时间
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const { data, error } = await client
      .from('scheduled_tasks')
      .insert({
        task_name: taskName,
        task_type: taskType,
        categories: categories || [],
        schedule_time: scheduleTime,
        next_run: nextRun.toISOString(),
        is_active: isActive,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建任务失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: '定时任务创建成功',
    });
  } catch (error) {
    console.error('创建定时任务失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取定时任务列表
 */
export async function GET() {
  try {
    const client = getSupabaseClient();

    // 如果数据库未配置，返回空列表
    if (!client) {
      return NextResponse.json({
        success: true,
        demo: true,
        data: [],
        message: '数据库未配置',
      });
    }

    const { data, error } = await client
      .from('scheduled_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('获取定时任务失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新定时任务
 */
export async function PUT(request: NextRequest) {
  try {
    const { id, taskName, categories, scheduleTime, isActive } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: '任务ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 如果数据库未配置，返回成功
    if (!client) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: '定时任务已更新（演示模式），数据库未配置',
      });
    }

    const updateData: {
      task_name?: string;
      categories?: string[];
      schedule_time?: string;
      next_run?: string;
      is_active?: boolean;
    } = {};
    if (taskName !== undefined) updateData.task_name = taskName;
    if (categories !== undefined) updateData.categories = categories;
    if (scheduleTime !== undefined) {
      updateData.schedule_time = scheduleTime;

      // 重新计算下次执行时间
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const nextRun = new Date();
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= new Date()) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      updateData.next_run = nextRun.toISOString();
    }
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await client
      .from('scheduled_tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新任务失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: '任务更新成功',
    });
  } catch (error) {
    console.error('更新定时任务失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除定时任务
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '任务ID不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 如果数据库未配置，返回成功
    if (!client) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: '定时任务已删除（演示模式），数据库未配置',
      });
    }

    const { error } = await client
      .from('scheduled_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`删除任务失败: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    console.error('删除定时任务失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
