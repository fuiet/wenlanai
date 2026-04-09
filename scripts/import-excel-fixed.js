import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// 加载环境变量
function loadEnv() {
  try {
    dotenv.config();
    if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
      return;
    }
  } catch (e) {
    // ignore
  }

  try {
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    // Silently fail
  }
}

async function importExcelToDatabase() {
  try {
    console.log('开始导入Excel文件...');

    // 加载环境变量
    loadEnv();

    const supabaseUrl = process.env.COZE_SUPABASE_URL;
    const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('缺少Supabase环境变量');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 读取Excel文件
    const filePath = '/workspace/projects/assets/小号爆文列表-2026-04-07.xls';
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    console.log('工作表名称:', firstSheetName);

    // 转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log(`Excel文件包含 ${jsonData.length} 行数据`);
    console.log('前3行数据示例:');
    console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));

    // 解析数据 - 使用正确的列名映射
    const articles = jsonData.map((row, index) => {
      const title = row['标题'] || row['title'] || '';
      const account = row['公众号'] || row['账号'] || row['account'] || '';
      // Excel中的实际列名是"阅读数"、"点赞数"，而不是"阅读量"
      const reads = parseInt(String(row['阅读数'] || row['阅读量'] || row['reads'] || '0').replace(/,/g, '')) || 0;
      const likes = parseInt(String(row['点赞数'] || row['点赞'] || row['likes'] || '0').replace(/,/g, '')) || 0;
      const shares = parseInt(String(row['转发数'] || row['转发'] || row['shares'] || '0').replace(/,/g, '')) || 0;
      const category = row['分类'] || row['标签'] || row['category'] || '其它';
      // Excel中的实际列名是"发文日期"
      const publishDate = row['发文日期'] || row['发布日期'] || row['日期'] || row['publish_date'] || new Date().toISOString().split('T')[0];
      // Excel中的实际列名是"文章链接"
      const url = row['文章链接'] || row['链接'] || row['url'] || `excel-import-${Date.now()}-${index}`;
      const snippet = row['摘要'] || row['简介'] || row['description'] || '';

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
        fetch_date: new Date().toISOString().split('T')[0],
      };
    }).filter(article => article.title && article.account);

    console.log(`解析出 ${articles.length} 篇有效文章`);

    // 打印第一篇文章的详细信息，用于调试
    if (articles.length > 0) {
      console.log('第一篇文章详情:', JSON.stringify(articles[0], null, 2));
    }

    // 过滤最近30天的数据
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const recentArticles = articles.filter(article => {
      return article.publish_date >= cutoffDateStr;
    });

    console.log(`最近30天的文章: ${recentArticles.length} 篇`);

    if (recentArticles.length === 0) {
      console.log('没有最近30天的文章，退出导入');
      return;
    }

    // 保存到数据库
    console.log('开始保存到数据库...');

    // 分批插入（每次最多100条）
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < recentArticles.length; i += batchSize) {
      const batch = recentArticles.slice(i, i + batchSize);
      const { error } = await supabase
        .from('hot_articles')
        .upsert(batch, {
          onConflict: 'url',
        });

      if (error) {
        console.error(`批次 ${Math.floor(i / batchSize) + 1} 插入失败:`, error.message);
        errorCount += batch.length;
      } else {
        console.log(`批次 ${Math.floor(i / batchSize) + 1} 插入成功 (${batch.length} 条)`);
        successCount += batch.length;
      }
    }

    console.log(`导入完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`);

    // 查询数据库验证
    const { data: importedData, error: queryError } = await supabase
      .from('hot_articles')
      .select('title, account, reads, likes, publish_date')
      .eq('source', 'Excel导入')
      .limit(5);

    if (queryError) {
      console.error('查询验证失败:', queryError);
    } else {
      console.log('数据库中的导入数据示例:');
      console.log(JSON.stringify(importedData, null, 2));
    }

  } catch (error) {
    console.error('导入过程中出错:', error);
  }
}

importExcelToDatabase();
