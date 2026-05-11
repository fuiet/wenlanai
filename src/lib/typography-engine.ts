/**
 * 原子化随机排版引擎 v2
 * 输出纯文本格式，使用Markdown语法
 */

import { createClient } from '@supabase/supabase-js';

/**
 * 基础规则1：段落长度控制
 * 每段不超过30字，超过则在句号处拆分
 */
function splitLongParagraphs(content: string): string {
  const maxCharsPerParagraph = 30; // 每段不超过30字
  const minSentences = 2; // 拆分后每段至少2句

  // 先清理现有格式
  let cleanContent = content
    .replace(/<[^>]+>/g, '') // 移除HTML标签
    .replace(/\*\*/g, ''); // 移除Markdown加粗

  const paragraphs = cleanContent.split(/\n\n+/);
  const processedParagraphs: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // 检查是否超过长度限制
    if (trimmed.length <= maxCharsPerParagraph) {
      processedParagraphs.push(trimmed);
      continue;
    }

    // 按句子拆分
    const sentences = trimmed.match(/[^.!?。！？]+[.!?。！？]+/g) || [trimmed];
    
    if (sentences.length < minSentences) {
      processedParagraphs.push(trimmed);
      continue;
    }

    // 重新组合，确保每段不超过限制
    let currentGroup = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      if (currentLength + sentence.length > maxCharsPerParagraph && currentGroup) {
        processedParagraphs.push(currentGroup.trim());
        currentGroup = sentence;
        currentLength = sentence.length;
      } else {
        currentGroup += sentence;
        currentLength += sentence.length;
      }
    }

    if (currentGroup.trim()) {
      processedParagraphs.push(currentGroup.trim());
    }
  }

  return processedParagraphs.join('\n\n');
}

/**
 * 基础规则2：识别序列词作为小标题并加粗
 */
function formatSectionTitles(content: string): string {
  // 序列词模式
  const sectionPatterns = [
    /([一二三四五六七八九十]、[^\n，。！？]+)/g,
    /(第[一二三四五六七八九十]?[章节点项][：:：]?[^\n，。！？]+)/g,
    /((?:首先|其次|最后|第一|第二|第三|第四)[，,][^\n，。！？]+)/g,
    /(误区[一二三四][：:：]?[^\n，。！？]+)/g,
  ];

  let result = content;
  for (const pattern of sectionPatterns) {
    result = result.replace(pattern, '**$1**');
  }

  return result;
}

/**
 * 基础规则3：识别总结引导词并单独成段
 */
function formatSummarySentences(content: string): string {
  const summaryKeywords = ['总之', '记住', '关键是', '最重要的是', '最后总结', '总的来说', '总而言之', '一句话'];
  
  for (const keyword of summaryKeywords) {
    // 确保关键词后面的内容独立成段
    const regex = new RegExp(`(，${keyword}|。${keyword})([^。！？]+[。！？])`, 'g');
    content = content.replace(regex, '\n\n**$1$2**\n\n');
  }

  return content;
}

// ==================== 原子化随机维度 ====================

interface RandomDimensions {
  keywordStyle: 'A' | 'B' | 'C';
  emphasisColor: 'A' | 'B' | 'C';
  listStyle: 'A' | 'B' | 'C';
}

// 随机选择
function randomChoice<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 生成随机维度组合
 */
function generateRandomDimensions(): RandomDimensions {
  return {
    keywordStyle: randomChoice(['A', 'B', 'C']),
    emphasisColor: randomChoice(['A', 'B', 'C']),
    listStyle: randomChoice(['A', 'B', 'C']),
  };
}

/**
 * 关键词处理（Markdown加粗）
 */
function applyKeywordStyle(content: string, style: 'A' | 'B' | 'C'): string {
  switch (style) {
    case 'A': // 数据类关键词加粗
      return content
        .replace(/(\d+%)/g, '**$1**')
        .replace(/(\d+万|\d+亿|\d+个)/g, '**$1**');
    case 'B': // 强调类关键词加粗
      return content
        .replace(/(一定|并非|才是|必须|恰恰)/g, '**$1**');
    case 'C': // 所有数字加粗
      return content
        .replace(/(\d+)/g, '**$1**');
    default:
      return content;
  }
}

/**
 * 列表样式处理
 */
function applyListStyle(content: string, style: 'A' | 'B' | 'C'): string {
  switch (style) {
    case 'A': // 数字列表
      let num = 0;
      return content.replace(/^[-●·]\s*(.+)$/gm, () => {
        num++;
        return `${num}. $1`;
      });
    case 'B': // 符号列表
      return content.replace(/^[-●·]\s*(.+)$/gm, '● $1');
    case 'C': // 无符号，换行
      return content.replace(/^[-●·]\s*/gm, '');
    default:
      return content;
  }
}

/**
 * 清理最终输出
 */
function cleanFinalOutput(content: string): string {
  return content
    // 清理HTML残留
    .replace(/<[^>]+>/g, '')
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    // 清理行首行尾空白
    .replace(/^\s+|\s+$/gm, '')
    // 清理连续标点
    .replace(/[，。、；：]{3,}/g, '，')
    // 清理装饰符号
    .replace(/[✦✧◆◇○●◉◐◑▪▫■□▲△▼▽▎▍▌▂▃▅▆▇━┅┆┇┊┋]+/g, '')
    // 清理图注文字
    .replace(/图\d+[：:：]?\s*/g, '')
    .replace(/配图\d+/g, '')
    .replace(/（[^）]*图[^）]*）/g, '')
    .replace(/\([^)]*图[^)]*\)/g, '')
    // 清理残留的代码符号
    .replace(/[<>{}]/g, '')
    // 清理连续空行
    .replace(/\n\n+/g, '\n\n');
}

/**
 * 主函数：应用排版引擎
 */
export function typographyEngine(
  content: string,
  topic: string
): { content: string; dimensions: Record<string, string> } {
  // 1. 基础规则1：段落拆分（强制执行）
  let result = splitLongParagraphs(content);
  
  // 2. 基础规则2：序列词小标题（强制执行）
  result = formatSectionTitles(result);
  
  // 3. 基础规则3：总结引导词（强制执行）
  result = formatSummarySentences(result);
  
  // 4. 随机维度
  const dimensions = generateRandomDimensions();
  
  // 应用随机样式
  result = applyKeywordStyle(result, dimensions.keywordStyle);
  result = applyListStyle(result, dimensions.listStyle);
  
  // 5. 最终清理
  result = cleanFinalOutput(result);
  
  return {
    content: result,
    dimensions: {
      keywordStyle: dimensions.keywordStyle,
      listStyle: dimensions.listStyle,
      paragraphSplit: 'enabled',
      maxCharsPerParagraph: '30',
    },
  };
}

export default typographyEngine;
