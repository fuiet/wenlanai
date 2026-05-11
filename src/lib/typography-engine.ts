/**
 * 排版引擎 - 简洁留白风格
 * 
 * 核心规则：
 * 1. 段落拆分：每段不超过4行
 * 2. 呼吸感留白：段落之间空一行
 * 3. 左对齐：无首行缩进
 * 4. 简洁强调：颜色+下划线，不用复杂装饰
 */

interface TypographyConfig {
  // 基础配置
  maxLinesPerParagraph: number; // 每段最大行数
  
  // 间距配置
  paragraphSpacing: 'compact' | 'relaxed' | 'breathing';
  
  // 强调配置
  emphasisStyle: 'color' | 'underline' | 'bold' | 'simple';
  
  // 主题色
  themeColor: string;
}

interface TypographyResult {
  content: string;
  config: TypographyConfig;
  stats: {
    originalLength: number;
    finalLength: number;
    paragraphCount: number;
    imageCount: number;
    averageLinesPerParagraph: number;
  };
}

// 默认配置
const defaultConfig: TypographyConfig = {
  maxLinesPerParagraph: 4,
  paragraphSpacing: 'breathing', // 宽松留白
  emphasisStyle: 'simple', // 简洁风格
  themeColor: '#E53E3E', // 红色强调
};

/**
 * 主入口函数
 */
export function typographyEngine(
  content: string,
  config?: Partial<TypographyConfig>
): TypographyResult {
  const finalConfig = { ...defaultConfig, ...config };
  
  let processed = content;
  
  // 1. 清理原有格式
  processed = cleanExistingFormat(processed);
  
  // 2. 拆分过长段落
  processed = splitLongParagraphs(processed, finalConfig.maxLinesPerParagraph);
  
  // 3. 处理强调标记
  processed = processEmphasis(processed, finalConfig.themeColor);
  
  // 4. 添加呼吸感留白
  processed = addBreathingSpace(processed, finalConfig.paragraphSpacing);
  
  // 5. 统计信息
  const stats = calculateStats(content, processed);
  
  return {
    content: processed,
    config: finalConfig,
    stats,
  };
}

/**
 * 清理原有格式
 */
function cleanExistingFormat(text: string): string {
  let result = text;
  
  // 移除图片占位符的复杂格式
  result = result.replace(/\n\n§§IMAGE:([^\n]+)§§\n\n/g, '\n\n§§IMAGE:$1§§\n\n');
  
  // 移除原有的段落分隔符
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // 清理HTML标签
  result = result.replace(/<[^>]+>/g, '');
  
  return result.trim();
}

/**
 * 拆分过长段落
 * 在句号处断段，确保每段不超过指定行数
 */
function splitLongParagraphs(text: string, maxLines: number): string {
  // 估算：中文每行约20-30字
  const avgCharsPerLine = 25;
  const maxCharsPerParagraph = maxLines * avgCharsPerLine;
  
  const lines = text.split('\n');
  const result: string[] = [];
  
  for (const line of lines) {
    // 如果是非空行
    if (line.trim()) {
      // 如果行太长，在句号处断开
      if (line.length > maxCharsPerParagraph) {
        const sentences = splitAtSentence(line);
        for (const sentence of sentences) {
          if (sentence.trim()) {
            result.push(sentence.trim());
          }
        }
      } else {
        result.push(line);
      }
    } else {
      // 空行保留，但限制连续空行
      if (result[result.length - 1] !== '') {
        result.push('');
      }
    }
  }
  
  return result.join('\n');
}

/**
 * 在句号处拆分长句
 */
function splitAtSentence(text: string): string[] {
  // 中文句号：。英文句号：.
  const sentenceEnders = /([。.!?！]+)/g;
  const parts: string[] = [];
  let current = '';
  
  const matches = text.split(sentenceEnders);
  
  for (let i = 0; i < matches.length; i++) {
    const part = matches[i];
    
    if (part.match(sentenceEnders)) {
      // 这是句末标点
      current += part;
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = '';
    } else {
      current += part;
    }
  }
  
  if (current.trim()) {
    parts.push(current.trim());
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * 处理强调标记
 * 将标记转换为简单的颜色强调
 */
function processEmphasis(text: string, themeColor: string): string {
  let result = text;
  
  // 处理核心金句标记
  result = result.replace(
    /§§KEY_POINT§§([\s\S]*?)§§KEY_POINT§§/g,
    (_, content) => `<KEY>${content.trim()}</KEY>`
  );
  
  // 处理引用标记
  result = result.replace(
    /§§QUOTE§§([\s\S]*?)§§QUOTE§§/g,
    (_, content) => `<QUOTE>${content.trim()}</QUOTE>`
  );
  
  return result;
}

/**
 * 添加呼吸感留白
 */
function addBreathingSpace(
  text: string,
  spacing: 'compact' | 'relaxed' | 'breathing'
): string {
  const lines = text.split('\n');
  const result: string[] = [];
  
  let lastWasEmpty = false;
  
  for (const line of lines) {
    if (line.trim() === '') {
      // 空行：只保留一个连续空行
      if (!lastWasEmpty) {
        result.push('');
        lastWasEmpty = true;
      }
    } else {
      result.push(line);
      lastWasEmpty = false;
    }
  }
  
  // 清理开头和结尾的空行
  while (result.length > 0 && result[0] === '') {
    result.shift();
  }
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }
  
  return result.join('\n');
}

/**
 * 计算统计信息
 */
function calculateStats(original: string, processed: string): TypographyResult['stats'] {
  const paragraphs = processed.split(/\n\n+/);
  const nonEmptyParagraphs = paragraphs.filter(p => p.trim());
  
  // 统计图片数量
  const imageMatches = processed.match(/§§IMAGE:([^§]+)§§/g) || [];
  
  // 计算平均每段行数
  const totalLines = nonEmptyParagraphs.length;
  
  return {
    originalLength: original.length,
    finalLength: processed.length,
    paragraphCount: nonEmptyParagraphs.length,
    imageCount: imageMatches.length,
    averageLinesPerParagraph: nonEmptyParagraphs.length > 0 
      ? Math.round((processed.split('\n').filter(l => l.trim()).length / nonEmptyParagraphs.length) * 10) / 10
      : 0,
  };
}

/**
 * 渲染排版后的文本（React组件用）
 */
export function renderTypography(
  content: string,
  themeColor: string = '#E53E3E'
): Array<{ type: 'text' | 'image' | 'key' | 'quote'; content: string }> {
  const parts: Array<{ type: 'text' | 'image' | 'key' | 'quote'; content: string }> = [];
  
  // 分割文本
  const segments = content.split(/(\n\n+)/);
  
  let currentParagraph: string[] = [];
  
  for (const segment of segments) {
    if (segment.match(/^\n\n+$/)) {
      // 空行分隔符
      if (currentParagraph.length > 0) {
        parts.push({
          type: 'text',
          content: currentParagraph.join('\n'),
        });
        currentParagraph = [];
      }
      parts.push({
        type: 'text',
        content: '',
      });
    } else if (segment.startsWith('§§IMAGE:')) {
      // 图片
      if (currentParagraph.length > 0) {
        parts.push({
          type: 'text',
          content: currentParagraph.join('\n'),
        });
        currentParagraph = [];
      }
      const match = segment.match(/§§IMAGE:([^§]+)§§/);
      if (match) {
        parts.push({
          type: 'image',
          content: match[1],
        });
      }
    } else if (segment.includes('<KEY>')) {
      // 核心金句
      if (currentParagraph.length > 0) {
        parts.push({
          type: 'text',
          content: currentParagraph.join('\n'),
        });
        currentParagraph = [];
      }
      const cleaned = segment
        .replace(/<KEY>/g, '')
        .replace(/<\/KEY>/g, '');
      parts.push({
        type: 'key',
        content: cleaned,
      });
    } else if (segment.includes('<QUOTE>')) {
      // 引用
      if (currentParagraph.length > 0) {
        parts.push({
          type: 'text',
          content: currentParagraph.join('\n'),
        });
        currentParagraph = [];
      }
      const cleaned = segment
        .replace(/<QUOTE>/g, '')
        .replace(/<\/QUOTE>/g, '');
      parts.push({
        type: 'quote',
        content: cleaned,
      });
    } else {
      currentParagraph.push(segment);
    }
  }
  
  // 处理最后一段
  if (currentParagraph.length > 0) {
    parts.push({
      type: 'text',
      content: currentParagraph.join('\n'),
    });
  }
  
  return parts.filter(p => p.type === 'text' ? p.content.trim() || true : true);
}
