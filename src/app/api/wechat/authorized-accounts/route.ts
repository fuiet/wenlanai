import { NextResponse } from 'next/server';

// 宝塔后端地址
const BACKEND_URL = process.env.WECHAT_BACKEND_URL || 'https://wenlanai.top';

/**
 * 获取已授权公众号列表
 * 从宝塔后端获取已授权的公众号信息
 */
export async function GET() {
  try {
    // 调用宝塔后端获取已授权公众号列表
    // 假设后端有一个接口返回 auth_xxx.json 文件列表
    const response = await fetch(`${BACKEND_URL}/wechat/authorized_accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json({
        success: true,
        data: result.accounts || [],
        message: '获取已授权公众号列表成功',
      });
    } else {
      // 如果后端接口不存在，返回模拟数据供前端使用
      return NextResponse.json({
        success: true,
        data: [],
        message: '请先授权公众号',
        demo: true,
      });
    }
  } catch (error) {
    console.error('获取已授权公众号列表失败:', error);
    
    // 返回空列表，前端会提示用户先授权
    return NextResponse.json({
      success: true,
      data: [],
      message: '请先授权公众号',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
