import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as XLSX from 'xlsx';

/**
 * 从Excel文件导入爆款文章数据到数据库
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: '文件URL不能为空' },
        { status: 400 }
      );
    }

    console.log('开始下载Excel文件:', fileUrl);

    // 下载Excel文件
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`下载文件失败: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // 转换为JSON数据
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Excel文件包含 ${jsonData.length} 行数据`);
    console.log('前5行数据:', JSON.stringify(jsonData.slice(0, 5), null, 2));

    // 解析数据并转换格式
    const articles = jsonData.map((row: any, index: number) => {
      // 尝试识别列名（可能的变化）
      const title = row['标题'] || row['title'] || row['文章标题'] || '';
      const account = row['公众号'] || row['account'] || row['账号'] || row['账号名称'] || '';
      const reads = parseInt(row['阅读量'] || row['reads'] || row['阅读数'] || '0') || 0;
      const likes = parseInt(row['点赞数'] || row['likes'] || row['点赞'] || '0') || 0;
      const shares = parseInt(row['分享数'] || row['shares'] || row['转发'] || '0') || 0;
      const category = row['分类'] || row['category'] || row['标签'] || '其它';
      const publishDate = row['发布日期'] || row['publish_date'] || row['日期'] || new Date().toISOString().split('T')[0];
      const url = row['链接'] || row['url'] || row['文章链接'] || '';
      const snippet = row['摘要'] || row['description'] || row['简介'] || '';

      return {
        title,
        account,
        reads,
        likes,
        shares,
        category,
        source: 'Excel导入',
        snippet,
        url,
        publish_date: publishDate,
      };
    }).filter(article => article.title && article.account); // 过滤掉无效数据

    console.log(`解析出 ${articles.length} 篇有效文章`);

    if (articles.length === 0) {
      return NextResponse.json(
        { error: '没有找到有效的文章数据' },
        { status: 400 }
      );
    }

    // 保存到数据库
    const client = getSupabaseClient();

    // 使用 upsert 插入/更新数据（基于URL去重）
    const { error: insertError } = await client
      .from('hot_articles')
      .upsert(articles, {
        onConflict: 'url',
      });

    if (insertError) {
      throw new Error(`保存文章失败: ${insertError.message}`);
    }

    console.log(`成功导入 ${articles.length} 篇文章到数据库`);

    return NextResponse.json({
      success: true,
      message: `成功导入 ${articles.length} 篇文章`,
      data: {
        totalImported: articles.length,
        sampleData: articles.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('导入Excel文件失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导入失败' },
      { status: 500 }
    );
  }
}
