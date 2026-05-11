/**
 * 原子化随机排版引擎
 * 核心逻辑：先执行不可变的段落基础规则，再对14个视觉维度独立随机取值
 */

import { createClient } from '@supabase/supabase-js';

// ==================== 底层基础规则（不可随机） ====================

/**
 * 基础规则1：段落长度控制
 * 每段不超过4行（150-200字），超过则在句号处拆分
 */
function splitLongParagraphs(content: string): string {
  const maxCharsPerParagraph = 180; // 约4行
  const minSentences = 2; // 拆分后每段至少2句

  const paragraphs = content.split(/\n\n+/);
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
 * 基础规则2：识别序列词作为小标题
 */
function extractSectionTitles(content: string): { title: string; index: number }[] {
  const sectionPatterns = [
    /(?:^|\n)([一二三四五六七八九十]、\s*[^\n]+)/gm,
    /(?:^|\n)(第一[章节点项]?\s*[：:：]?\s*[^\n]+)/gm,
    /(?:^|\n)(第二[章节点项]?\s*[：:：]?\s*[^\n]+)/gm,
    /(?:^|\n)(第三[章节点项]?\s*[：:：]?\s*[^\n]+)/gm,
    /(?:^|\n)(首先[，,]\s*[^\n]+)/gm,
    /(?:^|\n)(其次[，,]\s*[^\n]+)/gm,
    /(?:^|\n)(最后[，,]\s*[^\n]+)/gm,
    /(?:^|\n)(误区[一二三四]?\s*[：:：]?\s*[^\n]+)/gm,
  ];

  const titles: { title: string; index: number }[] = [];
  const contentLower = content.toLowerCase();

  for (const pattern of sectionPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const title = match[1].trim();
      if (title.length > 2 && title.length < 50) {
        titles.push({ title, index: match.index });
      }
    }
  }

  return titles.sort((a, b) => a.index - b.index);
}

/**
 * 基础规则3：识别总结引导词
 */
function extractSummarySentences(content: string): { sentence: string; index: number }[] {
  const summaryKeywords = ['总之', '记住', '关键是', '最重要的是', '最后总结', '总的来说', '总而言之', '一句话'];
  const sentences: { sentence: string; index: number }[] = [];
  
  const pattern = new RegExp(`([，。,;；])(?:(${summaryKeywords.join('|')})[^。！？]*[。！？])`, 'g');
  let match;
  
  while ((match = pattern.exec(content)) !== null) {
    const sentence = match[0].trim();
    if (sentence.length > 5 && sentence.length < 100) {
      sentences.push({ sentence, index: match.index });
    }
  }
  
  return sentences;
}

// ==================== 原子化随机维度 ====================

// 各维度的选项
type TitleStyle = 'A' | 'B' | 'C' | 'D';
type TitlePrefix = 'A' | 'B' | 'C' | 'D';
type KeywordStyle = 'A' | 'B' | 'C' | 'D';
type QuoteStyle = 'A' | 'B' | 'C' | 'D' | 'E';
type ImageRadius = 'A' | 'B' | 'C' | 'D';
type ImageBorder = 'A' | 'B';
type CaptionPosition = 'A' | 'B' | 'C';
type CaptionStyle = 'A' | 'B' | 'C';
type LetterSpacing = 'A' | 'B' | 'C';
type Decoration = 'A' | 'B';
type DividerStyle = 'A' | 'B' | 'C';
type EmphasisColor = 'A' | 'B' | 'C' | 'D';
type ListStyle = 'A' | 'B' | 'C';
type EndStyle = 'A' | 'B' | 'C';

interface RandomDimensions {
  titleStyle: TitleStyle;
  titlePrefix: TitlePrefix;
  keywordStyle: KeywordStyle;
  quoteStyle: QuoteStyle;
  imageRadius: ImageRadius;
  imageBorder: ImageBorder;
  captionPosition: CaptionPosition;
  captionStyle: CaptionStyle;
  letterSpacing: LetterSpacing;
  decoration: Decoration;
  dividerStyle: DividerStyle;
  emphasisColor: EmphasisColor;
  listStyle: ListStyle;
  endStyle: EndStyle;
}

// 随机选择一个选项
function randomChoice<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 生成随机维度组合
 */
function generateRandomDimensions(): RandomDimensions {
  return {
    titleStyle: randomChoice(['A', 'B', 'C', 'D']),
    titlePrefix: randomChoice(['A', 'B', 'C', 'D']),
    keywordStyle: randomChoice(['A', 'B', 'C', 'D']),
    quoteStyle: randomChoice(['A', 'B', 'C', 'D', 'E']),
    imageRadius: randomChoice(['A', 'B', 'C', 'D']),
    imageBorder: randomChoice(['A', 'B']),
    captionPosition: randomChoice(['A', 'B', 'C']),
    captionStyle: randomChoice(['A', 'B', 'C']),
    letterSpacing: randomChoice(['A', 'B', 'C']),
    decoration: randomChoice(['A', 'B']),
    dividerStyle: randomChoice(['A', 'B', 'C']),
    emphasisColor: randomChoice(['A', 'B', 'C', 'D']),
    listStyle: randomChoice(['A', 'B', 'C']),
    endStyle: randomChoice(['A', 'B', 'C']),
  };
}

// ==================== 样式规则映射 ====================

/**
 * 标题样式处理
 */
function applyTitleStyle(content: string, style: TitleStyle): string {
  switch (style) {
    case 'A': // 一级标题加粗+字号120%，二级仅加粗
      return content
        .replace(/^## (.+)$/gm, '## **$1** <small>*（原文大小）*</small>')
        .replace(/^### (.+)$/gm, '### **$1**');
    case 'B': // 一级加粗+字号110%，二级加粗+变主题色
      return content
        .replace(/^## (.+)$/gm, '## **$1**')
        .replace(/^### (.+)$/gm, '### <span style="color:#1890ff">**$1**</span>');
    case 'C': // 各级标题仅加粗
      return content
        .replace(/^## (.+)$/gm, '## **$1**')
        .replace(/^### (.+)$/gm, '### **$1**');
    case 'D': // 标题加粗+字间距拉宽5%
      return content
        .replace(/^## (.+)$/gm, '## <span style="letter-spacing:5px">**$1**</span>')
        .replace(/^### (.+)$/gm, '### <span style="letter-spacing:5px">**$1**</span>');
    default:
      return content;
  }
}

/**
 * 标题前缀处理
 */
function applyTitlePrefix(content: string, prefix: TitlePrefix): string {
  switch (prefix) {
    case 'A': // 无前缀
      return content;
    case 'B': // 数字序号
      let counter = 0;
      return content.replace(/^## (.+)$/gm, () => {
        counter++;
        return `## ${counter}、 ${content.split('\n').find(l => l.includes(arguments[1]))?.replace(/^## /, '') || arguments[1]}`;
      }).replace(/^(\d+)、 (.+)$/, '## $1、 $2');
    case 'C': // 符号前缀
      // 使用数字序号，不使用装饰符号
      return content
        .replace(/^## (.+)$/gm, '## $1');
    case 'D': // 无前缀，但标题上方加空行
      return content
        .replace(/^## ([^▎▶])/gm, '\n## $1');
    default:
      return content;
  }
}

/**
 * 关键词处理
 */
function applyKeywordStyle(content: string, style: KeywordStyle): string {
  switch (style) {
    case 'A': // 数据类关键词加粗
      return content
        .replace(/(\d+%)/g, '**$1**')
        .replace(/(\d+万|\d+亿|\d+个)/g, '**$1**');
    case 'B': // 强调类关键词加粗
      return content
        .replace(/(一定|并非|才是|必须|才是|恰恰)/g, '**$1**');
    case 'C': // 关键词加粗并变主题色
      return content
        .replace(/(\d+%)/g, '<span style="color:#1890ff;font-weight:bold">$1</span>')
        .replace(/(一定|并非|才是|必须)/g, '<span style="color:#1890ff;font-weight:bold">$1</span>');
    case 'D': // 不做任何处理
      return content;
    default:
      return content;
  }
}

/**
 * 引用句样式处理
 */
function applyQuoteStyle(content: string, style: QuoteStyle): string {
  switch (style) {
    case 'A': // 左侧加竖线，整句加粗
      return content.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #1890ff;padding-left:15px;font-weight:bold">$1</blockquote>');
    case 'B': // 浅灰背景条
      return content.replace(/^> (.+)$/gm, '<blockquote style="background:#f5f5f5;padding:10px 15px;border-radius:4px">$1</blockquote>');
    case 'C': // 前后加省略号装饰，居中
      return content.replace(/^> (.+)$/gm, '<blockquote style="text-align:center;color:#666">... $1 ...</blockquote>');
    case 'D': // 加引号包裹
      return content.replace(/^> (.+)$/gm, '<blockquote>"$1"</blockquote>');
    case 'E': // 融入正文
      return content.replace(/^> /gm, '');
    default:
      return content;
  }
}

/**
 * 图片圆角处理
 */
function applyImageRadius(content: string, radius: ImageRadius): string {
  const radiusMap = { A: '0', B: '4px', C: '8px', D: '12px' };
  const r = radiusMap[radius];
  return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<img src="${url}" alt="${alt}" style="border-radius:${r};max-width:100%" />`;
  });
}

/**
 * 图片边框处理
 */
function applyImageBorder(content: string, border: ImageBorder): string {
  if (border === 'B') {
    return content.replace(/<img /g, '<img style="border:1px solid #e8e8e8" ');
  }
  return content;
}

/**
 * 图片说明位置处理
 */
function applyCaptionPosition(content: string, position: CaptionPosition): string {
  const alignMap = { A: 'center', B: 'left', C: 'right' };
  const align = alignMap[position];
  return content.replace(/<p>(图：[^<]+)<\/p>/g, `<p style="text-align:${align}">$1</p>`);
}

/**
 * 图片说明样式处理
 */
function applyCaptionStyle(content: string, style: CaptionStyle): string {
  switch (style) {
    case 'A': // 灰色小字
      return content.replace(/(图：[^<]+)/g, '<span style="color:#999;font-size:14px">$1</span>');
    case 'B': // 灰色小字+斜体
      return content.replace(/(图：[^<]+)/g, '<span style="color:#999;font-size:14px;font-style:italic">$1</span>');
    case 'C': // 加粗小字
      return content.replace(/(图：[^<]+)/g, '<span style="color:#999;font-size:14px;font-weight:bold">$1</span>');
    default:
      return content;
  }
}

/**
 * 字间距处理
 */
function applyLetterSpacing(content: string, spacing: LetterSpacing): string {
  const spacingMap = { A: '0', B: '1px', C: '2px' };
  const s = spacingMap[spacing];
  return `<div style="letter-spacing:${s}">${content}</div>`;
}

/**
 * 首字放大处理
 */
function applyDecoration(content: string, decoration: Decoration, themeColor: string = '#1890ff'): string {
  if (decoration === 'B') {
    // 首段首字放大
    const paragraphs = content.split('\n\n');
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0];
      const firstChar = firstPara.charAt(0);
      const restChars = firstPara.slice(1);
      paragraphs[0] = `<p style="text-indent:0"><span style="float:left;font-size:2.5em;line-height:1.2;color:${themeColor};margin-right:5px">${firstChar}</span>${restChars}</p>`;
      return paragraphs.join('\n\n');
    }
  }
  return content;
}

/**
 * 分隔方式处理
 * 限制分隔线数量，最多2条，避免过于密集
 */
function applyDividerStyle(content: string, divider: DividerStyle): string {
  switch (divider) {
    case 'A': // 空行分隔（默认）
      return content;
    case 'B': // 细线分隔 - 最多2条，避免过于密集
      // 计算段落数量，只有超过5段才加分隔线
      const paragraphs = content.split(/\n\n/).filter(p => p.trim().length > 0);
      if (paragraphs.length < 5) {
        return content; // 段落太少，不加分隔线
      }
      // 只在最合适的2个位置加分隔线（1/3和2/3处）
      const insertPositions = [Math.floor(paragraphs.length / 3), Math.floor(paragraphs.length * 2 / 3)];
      let result = content;
      let offset = 0;
      let count = 0;
      const parts = result.split(/\n\n/);
      const newParts: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        newParts.push(parts[i]);
        if (insertPositions.includes(i) && count < 2) {
          newParts.push('<hr style="border:none;border-top:1px solid #e8e8e8;margin:24px 0" />');
          count++;
        } else if (i < parts.length - 1) {
          newParts.push('\n\n');
        }
      }
      return newParts.join('');
    case 'C': // 自然留白
      return content.replace(/\n\n\n+/g, '\n\n');
    default:
      return content;
  }
}

/**
 * 强调文字颜色处理
 */
function applyEmphasisColor(content: string, color: EmphasisColor, themeColor: string = '#1890ff'): string {
  switch (color) {
    case 'A': // 随主题色
      return content.replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${themeColor}">$1</strong>`);
    case 'B': // 固定深蓝
      return content.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#1a1a4e">$1</strong>');
    case 'C': // 固定暖橙
      return content.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#ff6b35">$1</strong>');
    case 'D': // 保持黑色
      return content;
    default:
      return content;
  }
}

/**
 * 列表样式处理
 */
function applyListStyle(content: string, style: ListStyle): string {
  switch (style) {
    case 'A': // 数字列表
      let num = 0;
      return content.replace(/^[-•] (.+)$/gm, () => {
        num++;
        return `${num}. $1`;
      });
    case 'B': // 符号列表
      return content.replace(/^\d+\. /gm, '● ');
    case 'C': // 无符号，仅换行
      return content.replace(/^[-•●] /gm, '');
    default:
      return content;
  }
}

/**
 * 结尾样式处理（已禁用：文章结尾不添加任何特殊标记）
 */
function applyEndStyle(content: string, style: EndStyle, themeColor: string = '#1890ff'): string {
  // 不对结尾做任何特殊处理，保留原文结尾
  return content;
}

// ==================== 主排版引擎 ====================

export interface TypographyResult {
  content: string;
  dimensions: RandomDimensions;
  rules: {
    paragraphSplit: boolean;
    sectionExtracted: boolean;
    summaryExtracted: boolean;
  };
}

/**
 * 原子化随机排版引擎
 * @param content 原始文章内容
 * @param themeColor 主题色（用于强调等）
 * @param seed 随机种子（可选，用于复现）
 */
export function typographyEngine(
  content: string,
  themeColor: string = '#1890ff',
  seed?: number
): TypographyResult {
  // 如果有种子，使用确定性随机
  let result = content;

  // ========== 第一步：执行底层基础规则（不可随机）==========

  // 1. 段落长度控制
  result = splitLongParagraphs(result);

  // 2. 识别序列词作为小标题并加粗
  const sectionTitles = extractSectionTitles(result);
  for (const { title } of sectionTitles) {
    // 将标题行加粗
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedTitle), `**${title}**`);
  }

  // 3. 识别总结引导词单独成段
  const summarySentences = extractSummarySentences(result);
  for (const { sentence } of summarySentences) {
    result = result.replace(sentence, `\n\n**${sentence}**\n\n`);
  }

  // ========== 第二步：生成随机维度组合 ==========
  
  let dimensions: RandomDimensions;
  if (seed !== undefined) {
    // 使用种子生成确定性随机
    const seededRandom = () => {
      seed = (seed! * 9301 + 49297) % 233280;
      return seed! / 233280;
    };
    dimensions = {
      titleStyle: ['A', 'B', 'C', 'D'][Math.floor(seededRandom() * 4)] as TitleStyle,
      titlePrefix: ['A', 'B', 'C', 'D'][Math.floor(seededRandom() * 4)] as TitlePrefix,
      keywordStyle: ['A', 'B', 'C', 'D'][Math.floor(seededRandom() * 4)] as KeywordStyle,
      quoteStyle: ['A', 'B', 'C', 'D', 'E'][Math.floor(seededRandom() * 5)] as QuoteStyle,
      imageRadius: ['A', 'B', 'C', 'D'][Math.floor(seededRandom() * 4)] as ImageRadius,
      imageBorder: ['A', 'B'][Math.floor(seededRandom() * 2)] as ImageBorder,
      captionPosition: ['A', 'B', 'C'][Math.floor(seededRandom() * 3)] as CaptionPosition,
      captionStyle: ['A', 'B', 'C'][Math.floor(seededRandom() * 3)] as CaptionStyle,
      letterSpacing: ['A', 'B', 'C'][Math.floor(seededRandom() * 3)] as LetterSpacing,
      decoration: ['A', 'B'][Math.floor(seededRandom() * 2)] as Decoration,
      dividerStyle: ['A', 'A', 'A', 'B', 'C'][Math.floor(seededRandom() * 5)] as DividerStyle, // A(空行)概率更高，B(细线)概率较低
      emphasisColor: ['A', 'B', 'C', 'D'][Math.floor(seededRandom() * 4)] as EmphasisColor,
      listStyle: ['A', 'B', 'C'][Math.floor(seededRandom() * 3)] as ListStyle,
      endStyle: ['A', 'B', 'C'][Math.floor(seededRandom() * 3)] as EndStyle,
    };
  } else {
    dimensions = generateRandomDimensions();
  }

  // ========== 第三步：应用各维度样式 ==========

  // 应用标题样式
  result = applyTitleStyle(result, dimensions.titleStyle);
  
  // 应用标题前缀
  result = applyTitlePrefix(result, dimensions.titlePrefix);
  
  // 应用关键词处理
  result = applyKeywordStyle(result, dimensions.keywordStyle);
  
  // 应用引用句样式
  result = applyQuoteStyle(result, dimensions.quoteStyle);
  
  // 应用图片样式（圆角、边框）
  result = applyImageRadius(result, dimensions.imageRadius);
  result = applyImageBorder(result, dimensions.imageBorder);
  
  // 应用图片说明样式
  result = applyCaptionPosition(result, dimensions.captionPosition);
  result = applyCaptionStyle(result, dimensions.captionStyle);
  
  // 应用字间距
  result = applyLetterSpacing(result, dimensions.letterSpacing);
  
  // 应用首字装饰
  result = applyDecoration(result, dimensions.decoration, themeColor);
  
  // 应用分隔方式
  result = applyDividerStyle(result, dimensions.dividerStyle);
  
  // 应用强调颜色
  result = applyEmphasisColor(result, dimensions.emphasisColor, themeColor);
  
  // 应用列表样式
  result = applyListStyle(result, dimensions.listStyle);
  
  // 应用结尾金句样式
  result = applyEndStyle(result, dimensions.endStyle, themeColor);

  // ========== 最终清理：移除所有可能的装饰符号和乱码 ==========
  result = result
    // 清理装饰符号
    .replace(/[✦✧◆◇○●◉◐◑▪▫■□▲△▼▽]/g, '')
    .replace(/[▎▍▌▂▃▅▆▇]/g, '')
    .replace(/[▶▷◀◁▼▽▲△]/g, '')
    .replace(/[━━━┅┆┇┊┋]/g, '')
    // 清理连续空白
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    // 清理行首行尾空白
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  return {
    content: result,
    dimensions,
    rules: {
      paragraphSplit: true,
      sectionExtracted: sectionTitles.length > 0,
      summaryExtracted: summarySentences.length > 0,
    },
  };
}

/**
 * 快速预览：生成指定数量的排版变体
 */
export function generateVariants(
  content: string,
  count: number = 3,
  themeColor: string = '#1890ff'
): TypographyResult[] {
  const variants: TypographyResult[] = [];
  for (let i = 0; i < count; i++) {
    variants.push(typographyEngine(content, themeColor));
  }
  return variants;
}

// 导出维度说明（用于调试或展示）
export const dimensionDescriptions = {
  titleStyle: {
    A: '一级标题加粗+放大120%，二级仅加粗',
    B: '一级加粗+放大110%，二级加粗+变主题色',
    C: '各级标题仅加粗',
    D: '标题加粗+字间距拉宽5%',
  },
  titlePrefix: {
    A: '无前缀',
    B: '数字序号',
    C: '符号前缀',
    D: '无前缀+上方空行',
  },
  keywordStyle: {
    A: '数据类关键词加粗',
    B: '强调类关键词加粗',
    C: '关键词加粗+主题色',
    D: '不做关键词处理',
  },
  quoteStyle: {
    A: '左侧竖线+加粗',
    B: '浅灰背景条',
    C: '省略号装饰+居中',
    D: '引号包裹',
    E: '融入正文',
  },
  imageRadius: {
    A: '0px直角',
    B: '4px圆角',
    C: '8px圆角',
    D: '12px圆角',
  },
  imageBorder: {
    A: '无边框',
    B: '1px浅灰边框',
  },
  captionPosition: {
    A: '居中',
    B: '左对齐',
    C: '右对齐',
  },
  captionStyle: {
    A: '灰色小字',
    B: '灰色斜体',
    C: '灰色加粗',
  },
  letterSpacing: {
    A: '标准',
    B: '略宽1px',
    C: '宽松2px',
  },
  decoration: {
    A: '无装饰',
    B: '首字放大下沉',
  },
  dividerStyle: {
    A: '空行分隔',
    B: '细线分隔',
    C: '自然留白',
  },
  emphasisColor: {
    A: '主题色',
    B: '深蓝色',
    C: '暖橙色',
    D: '保持黑色',
  },
  listStyle: {
    A: '数字列表',
    B: '符号列表',
    C: '无符号',
  },
  endStyle: {
    A: '加粗居中',
    B: '加粗左对齐+留白',
    C: '引号斜体',
  },
};
