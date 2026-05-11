/**
 * 原子化随机排版引擎 v3 - 四层随机引擎
 * 实现：基础规则 + 三层随机 + 拟人化干扰池
 * 输出纯文本格式，使用Markdown语法
 */

/**
 * ==================== 随机工具函数 ====================
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function randomBool(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * ==================== 接口定义 ====================
 */

// 第一层：结构骨架随机
interface Layer1Dimensions {
  paragraphBreath: 'A' | 'B' | 'C' | 'D'; // 段落呼吸感
  letterSpacing: 'A' | 'B' | 'C' | 'D';  // 字间距
  lineSpacing: 'A' | 'B' | 'C' | 'D';     // 行间距
  alignment: 'A' | 'B';                    // 整体对齐
}

// 第二层：细节纹理随机
interface Layer2Dimensions {
  titleStyle: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // 标题样式
  titlePrefix: 'A' | 'B' | 'C' | 'D' | 'E';      // 标题前缀
  keywordProcessing: 'A' | 'B' | 'C' | 'D' | 'E'; // 关键词处理
  quoteStyle: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'; // 引用句样式
  separatorStyle: 'A' | 'B' | 'C' | 'D' | 'E';   // 分隔方式
  paragraphDecoration: 'A' | 'B' | 'C';           // 段首装饰
  listStyle: 'A' | 'B' | 'C' | 'D';               // 列表样式
}

// 第三层：图片与多媒体随机
interface Layer3Dimensions {
  imageBorderRadius: 'A' | 'B' | 'C' | 'D' | 'E';    // 图片圆角
  imageBorder: 'A' | 'B' | 'C';                       // 图片边框
  imageCaptionPosition: 'A' | 'B' | 'C';             // 图片说明位置
  imageCaptionStyle: 'A' | 'B' | 'C' | 'D';           // 图片说明样式
  imageSpacing: 'A' | 'B' | 'C';                      // 图片上下间距
}

// 第四层：拟人化干扰
interface Layer4Interference {
  enabled: boolean;
  triggered: string[]; // 触发的干扰项名称列表
}

// 全部维度组合
interface RandomDimensions {
  layer1: Layer1Dimensions;
  layer2: Layer2Dimensions;
  layer3: Layer3Dimensions;
  layer4: Layer4Interference;
  themeColor: string;
}

/**
 * ==================== 随机维度生成器 ====================
 */

function generateLayer1Dimensions(): Layer1Dimensions {
  return {
    paragraphBreath: randomChoice(['A', 'B', 'C', 'D']),
    letterSpacing: randomChoice(['A', 'B', 'C', 'D']),
    lineSpacing: randomChoice(['A', 'B', 'C', 'D']),
    alignment: randomChoice(['A', 'B']),
  };
}

function generateLayer2Dimensions(): Layer2Dimensions {
  return {
    titleStyle: randomChoice(['A', 'B', 'C', 'D', 'E', 'F']),
    titlePrefix: randomChoice(['A', 'B', 'C', 'D', 'E']),
    keywordProcessing: randomChoice(['A', 'B', 'C', 'D', 'E']),
    quoteStyle: randomChoice(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
    separatorStyle: randomChoice(['A', 'B', 'C', 'D', 'E']),
    paragraphDecoration: randomChoice(['A', 'B', 'C']),
    listStyle: randomChoice(['A', 'B', 'C', 'D']),
  };
}

function generateLayer3Dimensions(): Layer3Dimensions {
  return {
    imageBorderRadius: randomChoice(['A', 'B', 'C', 'D', 'E']),
    imageBorder: randomChoice(['A', 'B', 'C']),
    imageCaptionPosition: randomChoice(['A', 'B', 'C']),
    imageCaptionStyle: randomChoice(['A', 'B', 'C', 'D']),
    imageSpacing: randomChoice(['A', 'B', 'C']),
  };
}

function generateLayer4Interference(): Layer4Interference {
  // 30%概率触发干扰
  if (!randomBool(0.3)) {
    return { enabled: false, triggered: [] };
  }

  const interferenceOptions = [
    'shortParagraph',     // 17.1: 随机某一段只有1-2句话
    'longParagraph',     // 17.2: 随机某一段略超过4行
    'boldMiss',          // 18.1: 随机漏掉1-2个本应加粗的关键词
    'boldExtra',         // 18.2: 随机对1-2个非关键词也加了粗
    'boldInconsistent',  // 18.3: 同一关键词首次出现加了粗，后面没加
    'spacingFloat',      // 19: 间距微浮动
    'indentOccasion',    // 20.1: 某一段被缩进处理
    'highlightOccasion', // 20.2: 某一段用浅灰背景标记
    'handSeparator',     // 20.3: 手打分隔符
    'captionGrayChange', // 20.4: 图片说明文字用了不一样的灰色深度
    'titleInconsistent', // 20.5: 某两级标题的加粗方式不一致
    'quoteStyleDiff',    // 21: 引用句的"随意感"
    'quoteIndentFloat',  // 21.2: 引用句缩进量随机浮动
  ];

  // 触发3-5种干扰
  const count = randomInt(3, 5);
  const triggered: string[] = [];
  const shuffled = [...interferenceOptions].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < count && i < shuffled.length; i++) {
    triggered.push(shuffled[i]);
  }

  return { enabled: true, triggered };
}

function generateRandomDimensions(themeColor: string = '#1890ff'): RandomDimensions {
  return {
    layer1: generateLayer1Dimensions(),
    layer2: generateLayer2Dimensions(),
    layer3: generateLayer3Dimensions(),
    layer4: generateLayer4Interference(),
    themeColor,
  };
}

/**
 * ==================== 基础规则（强制执行） ====================
 */

/**
 * 基础规则1：拆分过长段落
 * 每段不超过4行（约60-80字），超过则拆分
 */
function splitLongParagraphs(content: string): string {
  const maxLinesPerParagraph = 4;
  const placeholders: string[] = [];
  
  // 保护图片占位符
  let cleanContent = content.replace(/\{\{IMAGE_\d+\}\}/g, (match) => {
    placeholders.push(match);
    return `<<<IMG_PLACEHOLDER_${placeholders.length - 1}>>>`;
  });

  // 清理HTML标签和现有加粗
  cleanContent = cleanContent
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*/g, '§§DOUBLE_ASTERISK§§'); // 临时替换，用于后续恢复

  const paragraphs = cleanContent.split(/\n\n+/);
  const processedParagraphs: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // 还原加粗标记
    let processed = trimmed.replace(/§§DOUBLE_ASTERISK§§/g, '**');
    
    // 检查段落行数
    const lines = processed.split('\n');
    if (lines.length <= maxLinesPerParagraph) {
      processedParagraphs.push(processed);
      continue;
    }

    // 按句子拆分，重新组合
    const sentences = processed.match(/[^.!?。！？\n]+[.!?。！？\n]+/g) || [processed];
    let currentLines: string[] = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLines = sentence.split('\n').length;
      if (currentLines.length + sentenceLines > maxLinesPerParagraph && currentLines.length > 0) {
        processedParagraphs.push(currentLines.join(' '));
        currentLines = [sentence.trim()];
        currentLength = sentence.length;
      } else {
        currentLines.push(sentence.trim());
        currentLength += sentence.length;
      }
    }

    if (currentLines.length > 0) {
      processedParagraphs.push(currentLines.join(' '));
    }
  }

  // 还原占位符
  let result = processedParagraphs.join('\n\n');
  placeholders.forEach((placeholder, index) => {
    result = result.replace(`<<<IMG_PLACEHOLDER_${index}>>>`, placeholder);
  });

  return result;
}

/**
 * 基础规则2：识别序列词作为小标题并加粗
 */
function formatSectionTitles(content: string): string {
  const sectionPatterns = [
    /([一二三四五六七八九十]、[^\n，。！？]+)/g,
    /(第[一二三四五六七八九十]?[章节节][：:：]?[^\n，。！？]+)/g,
    /((?:首先|其次|接着|最后|第一点?|第二点?|第三点?)[，,：:][^\n，。！？]+)/g,
    /(误区[一二三四][：:：]?[^\n，。！？]+)/g,
    /(重点[一二三四][：:：]?[^\n，。！？]+)/g,
    /(关键[一二三四][：:：]?[^\n，。！？]+)/g,
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
  const summaryKeywords = ['总之', '记住', '关键是', '最重要的是', '最后总结', '总的来说', '总而言之', '一句话', '说到底'];
  
  for (const keyword of summaryKeywords) {
    const regex = new RegExp(`(，${keyword}|。${keyword})([^。！？\n]+[。！？])`, 'g');
    content = content.replace(regex, '\n\n**$1$2**\n\n');
  }

  return content;
}

/**
 * ==================== 第一层：结构骨架随机 ====================
 */

function applyParagraphBreath(content: string, style: 'A' | 'B' | 'C' | 'D'): string {
  const paragraphs = content.split(/\n\n+/);
  
  if (style === 'A') {
    // A：紧凑（段间空1行）- 不变，保持 \n\n
    return paragraphs.join('\n\n');
  } else if (style === 'B') {
    // B：标准（段间空1.5行）- 用特殊标记
    return paragraphs.join('\n\n§§BREAK_1.5§§\n\n');
  } else if (style === 'C') {
    // C：松弛（段间空2行）
    return paragraphs.join('\n\n\n\n');
  } else {
    // D：混合（前段紧凑，后段渐松）
    return paragraphs.map((p, i) => {
      const progress = i / paragraphs.length;
      const spacing = progress < 0.5 ? 1 : progress < 0.8 ? 1.5 : 2;
      const breaks = '§§BREAK_' + spacing + '§§';
      return p + (i < paragraphs.length - 1 ? breaks : '');
    }).join('\n');
  }
}

function applyLetterSpacing(content: string, style: 'A' | 'B' | 'C' | 'D'): string {
  // 字间距通过CSS类控制，这里只记录配置
  const spacingMap: Record<string, string> = {
    'A': '0px',
    'B': '0.5px',
    'C': '1px',
    'D': '1.5px',
  };
  return content; // 实际字间距在渲染时应用
}

function applyLineSpacing(content: string, style: 'A' | 'B' | 'C' | 'D'): string {
  // 行间距通过CSS类控制，这里只记录配置
  const spacingMap: Record<string, string> = {
    'A': '1.5',
    'B': '1.75',
    'C': '2',
    'D': '2.2',
  };
  return content;
}

function applyAlignment(content: string, style: 'A' | 'B'): string {
  // 对齐方式通过CSS类控制，这里只记录配置
  return content;
}

/**
 * ==================== 第二层：细节纹理随机 ====================
 */

function applyTitleStyle(content: string, style: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'): string {
  // 标题样式通过CSS类控制，这里处理Markdown标题的增强
  switch (style) {
    case 'A':
      // 一级加粗+字号120%，二级仅加粗 - 不改变Markdown
      return content;
    case 'B':
      // 一级加粗+变主题色 - 标记用于CSS处理
      return content.replace(/^#\s+(.+)$/gm, '# $1 §§THEME_COLOR§§');
    case 'C':
      // 极简 - 各级标题仅加粗
      return content;
    case 'D':
      // 典雅感 - 标题加粗+字间距拉宽5%
      return content.replace(/^#\s+(.+)$/gm, '# $1 §§TITLE_SPACING§§');
    case 'E':
      // 底部加细线装饰
      return content.replace(/^#\s+(.+)$/gm, '# $1 §§TITLE_LINE§§');
    case 'F':
      // 左侧加小色块
      return content.replace(/^#\s+(.+)$/gm, '# $1 §§TITLE_BLOCK§§');
    default:
      return content;
  }
}

function applyTitlePrefix(content: string, style: 'A' | 'B' | 'C' | 'D' | 'E'): string {
  const prefixes: Record<string, string[]> = {
    'A': [], // 无前缀
    'B': ['一、', '二、', '三、', '四、', '五、', '六、'], // 中文序号
    'C': ['1. ', '2. ', '3. ', '4. ', '5. ', '6. '], // 数字序号
    'D': ['▎ ', '▶ ', '● ', '○ ', '◆ '], // 几何符号
    'E': [], // 空行隔开
  };

  const prefixList = prefixes[style];
  if (prefixList.length === 0) return content;

  let prefixIndex = 0;
  return content.replace(/^##\s+(.+)$/gm, (match, title) => {
    const prefix = prefixList[prefixIndex % prefixList.length];
    prefixIndex++;
    return `## ${prefix}${title}`;
  });
}

function applyKeywordProcessing(content: string, style: 'A' | 'B' | 'C' | 'D' | 'E'): string {
  switch (style) {
    case 'A':
      // 仅数据类加粗
      return content
        .replace(/(\d+%)/g, '**$1**')
        .replace(/(\d+万|\d+亿)/g, '**$1**')
        .replace(/(\d+倍|\d+次)/g, '**$1**');
    case 'B':
      // 仅强调类加粗
      return content
        .replace(/(一定|并非|才是|必须|恰恰|其实|关键|核心|重点)/g, '**$1**');
    case 'C':
      // 数据+强调都加粗
      return content
        .replace(/(\d+%)/g, '**$1**')
        .replace(/(\d+万|\d+亿)/g, '**$1**')
        .replace(/(一定|并非|才是|必须|恰恰|其实|关键|核心|重点)/g, '**$1**');
    case 'D':
      // 加粗并变主题色
      return content
        .replace(/\*\*([^*]+)\*\*/g, '**§§THEME§§$1§§/THEME§§**');
    case 'E':
      // 不做任何关键词处理（极简风）
      return content;
    default:
      return content;
  }
}

function applyQuoteStyle(content: string, style: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'): string {
  // 引用句样式通过CSS类控制
  switch (style) {
    case 'A':
      // 左侧竖线 + 整句加粗
      return content.replace(/>\s*(.+)/g, '> **$1**');
    case 'B':
      // 浅灰背景条
      return content.replace(/>\s*(.+)/g, '> §§QUOTE_BG§§ $1 §§/QUOTE_BG§§');
    case 'C':
      // 前后省略号 + 斜体
      return content.replace(/>\s*(.+)/g, '> *...$1...*');
    case 'D':
      // 引号包裹
      return content.replace(/>\s*(.+)/g, '> " $1 "');
    case 'E':
      // 缩进 + 左侧边框
      return content.replace(/>\s*(.+)/g, '> §§QUOTE_INDENT§§ $1 §§/QUOTE_INDENT§§');
    case 'F':
      // 卡片式
      return content.replace(/>\s*(.+)/g, '> §§QUOTE_CARD§§ $1 §§/QUOTE_CARD§§');
    case 'G':
      // 融入正文
      return content.replace(/^>\s*/gm, '');
    default:
      return content;
  }
}

function applySeparatorStyle(content: string, style: 'A' | 'B' | 'C' | 'D' | 'E'): string {
  switch (style) {
    case 'A':
      // 仅空行
      return content;
    case 'B':
      // 通栏细线
      return content.replace(/\n\n([^\n])/g, '\n\n§§SEPARATOR_LINE§§\n$1');
    case 'C':
      // 居中短细线
      return content.replace(/\n\n([^\n])/g, '\n\n§§SEPARATOR_CENTER§§\n$1');
    case 'D':
      // 符号分隔
      return content.replace(/\n\n([^\n])/g, '\n\n§§SEPARATOR_DOTS§§\n$1');
    case 'E':
      // 无任何分隔
      return content;
    default:
      return content;
  }
}

function applyParagraphDecoration(content: string, style: 'A' | 'B' | 'C'): string {
  switch (style) {
    case 'A':
      // 无
      return content;
    case 'B':
      // 首字下沉
      return content.replace(/^([^\n])/, '§§DROP_CAP§§$1§§/DROP_CAP§§');
    case 'C':
      // 左侧加细线
      return content.replace(/^([^\n])/, '§§LEFT_LINE§§$1§§/LEFT_LINE§§');
    default:
      return content;
  }
}

function applyListStyle(content: string, style: 'A' | 'B' | 'C' | 'D'): string {
  switch (style) {
    case 'A':
      // 数字列表
      let num = 0;
      return content.replace(/^[-–]\s*(.+)$/gm, () => {
        num++;
        return `${num}. $1`;
      });
    case 'B':
      // 圆点列表
      return content.replace(/^[-–]\s*(.+)$/gm, '● $1');
    case 'C':
      // 短线列表
      return content;
    case 'D':
      // 无符号
      return content.replace(/^[-–●]\s*/gm, '');
    default:
      return content;
  }
}

/**
 * ==================== 第三层：图片与多媒体随机 ====================
 */

// 图片维度通过CSS类控制，这里记录配置
function getImageStyles(dimensions: Layer3Dimensions): {
  borderRadius: string;
  border: string;
  captionPosition: string;
  captionStyle: string;
  spacing: string;
} {
  const borderRadiusMap: Record<string, string> = {
    'A': '0px',
    'B': '4px',
    'C': '8px',
    'D': '12px',
    'E': '16px',
  };

  const borderMap: Record<string, string> = {
    'A': 'none',
    'B': '1px solid #E5E5E5',
    'C': '2px solid',
  };

  const captionPositionMap: Record<string, string> = {
    'A': 'center',
    'B': 'left',
    'C': 'right',
  };

  const captionStyleMap: Record<string, string> = {
    'A': 'color: #999; font-size: 12px;',
    'B': 'color: #999; font-size: 12px; font-style: italic;',
    'C': 'color: #999; font-size: 12px; font-weight: bold;',
    'D': 'font-size: 12px;',
  };

  const spacingMap: Record<string, string> = {
    'A': '1',
    'B': '2',
    'C': '3',
  };

  return {
    borderRadius: borderRadiusMap[dimensions.imageBorderRadius],
    border: borderMap[dimensions.imageBorder],
    captionPosition: captionPositionMap[dimensions.imageCaptionPosition],
    captionStyle: captionStyleMap[dimensions.imageCaptionStyle],
    spacing: spacingMap[dimensions.imageSpacing],
  };
}

/**
 * ==================== 第四层：拟人化干扰池 ====================
 */

function applyHumanInterference(content: string, interference: Layer4Interference): string {
  if (!interference.enabled || interference.triggered.length === 0) {
    return content;
  }

  let result = content;
  const paragraphs = result.split(/\n\n+/);

  for (const item of interference.triggered) {
    switch (item) {
      case 'shortParagraph': {
        // 17.1: 随机某一段只有1-2句话（像真人突然想到一个点就另起一段）
        if (paragraphs.length > 3) {
          const idx = randomInt(1, paragraphs.length - 2);
          const sentences = paragraphs[idx].match(/[^.!?。！？]+[.!?。！？]+/g) || [];
          if (sentences.length > 2) {
            const lastSentence = sentences.pop();
            if (lastSentence) {
              paragraphs[idx] = sentences.join('');
              paragraphs.splice(idx + 1, 0, lastSentence.trim());
            }
          }
        }
        break;
      }

      case 'longParagraph': {
        // 17.2: 随机某一段略超过4行（多1-2行）
        if (paragraphs.length > 2) {
          const idx = randomInt(0, paragraphs.length - 1);
          const lines = paragraphs[idx].split('\n');
          if (lines.length < 4) {
            paragraphs[idx] = lines.join(' ') + ' ' + lines.join(' '); // 合并变成超长段
          }
        }
        break;
      }

      case 'boldMiss': {
        // 18.1: 随机漏掉1-2个本应加粗的关键词（像忘了）
        const boldCount = (result.match(/\*\*/g) || []).length / 2;
        if (boldCount > 2) {
          const missCount = randomInt(1, Math.min(2, Math.floor(boldCount / 3)));
          for (let i = 0; i < missCount; i++) {
            result = result.replace(/\*\*([^*]+)\*\*/, '$1');
          }
        }
        break;
      }

      case 'boldExtra': {
        // 18.2: 随机对1-2个非关键词也加了粗（像手滑选中多余文字）
        const extraCount = randomInt(1, 2);
        for (let i = 0; i < extraCount; i++) {
          const normalWords = result.match(/[，。、；：][^，。、；：]{2,4}[，。、；：]/g) || [];
          if (normalWords.length > 0) {
            const word = randomChoice(normalWords);
            result = result.replace(word, '**' + word + '**');
          }
        }
        break;
      }

      case 'boldInconsistent': {
        // 18.3: 同一关键词首次出现加了粗，后面再出现时没加
        const boldWords = result.match(/\*\*([^*]+)\*\*/g) || [];
        if (boldWords.length > 2 && boldWords[0]) {
          const uniqueWord = boldWords[0].replace(/\*\*/g, '');
          const lastIndex = result.lastIndexOf(uniqueWord);
          const firstMatch = result.match(new RegExp('\\*\\*' + uniqueWord + '\\*\\*'));
          if (firstMatch && lastIndex > 0) {
            result = result.replace(uniqueWord + '**', uniqueWord);
          }
        }
        break;
      }

      case 'spacingFloat': {
        // 19: 间距微浮动（修改特殊标记）
        result = result.replace(/§§BREAK_([\d.]+)§§/g, (match, val) => {
          const float = parseFloat(val) * (1 + (Math.random() - 0.5) * 0.4);
          return `§§BREAK_${float.toFixed(1)}§§`;
        });
        break;
      }

      case 'indentOccasion': {
        // 20.1: 5%概率，某一段被缩进处理
        if (randomBool(0.05) && paragraphs.length > 1) {
          const idx = randomInt(0, paragraphs.length - 1);
          paragraphs[idx] = '§§INDENT§§' + paragraphs[idx];
        }
        break;
      }

      case 'highlightOccasion': {
        // 20.2: 3%概率，某一段用浅灰背景标记
        if (randomBool(0.03) && paragraphs.length > 1) {
          const idx = randomInt(0, paragraphs.length - 1);
          paragraphs[idx] = '§§HIGHLIGHT§§' + paragraphs[idx] + '§§/HIGHLIGHT§§';
        }
        break;
      }

      case 'handSeparator': {
        // 20.3: 2%概率，手打分隔符
        if (randomBool(0.02)) {
          const idx = randomInt(1, paragraphs.length - 1);
          paragraphs[idx - 1] += '\n***';
        }
        break;
      }

      case 'captionGrayChange': {
        // 20.4: 3%概率，图片说明文字用了不一样的灰色深度
        if (result.includes('{{IMAGE_')) {
          result = result.replace(/\[\[CAPTION_(\d+)\]\]/g, () => {
            if (randomBool(0.03)) {
              const grayDepths = ['#888', '#AAA', '#666', '#777'];
              return `§§CAPTION§§ style="color: ${randomChoice(grayDepths)}"§§/CAPTION§§`;
            }
            return '[[CAPTION_$1]]';
          });
        }
        break;
      }

      case 'titleInconsistent': {
        // 20.5: 4%概率，某两级标题的加粗方式不一致
        if (randomBool(0.04)) {
          result = result.replace(/^## (.+)$/m, '## §§NO_BOLD§§$1§§/NO_BOLD§§');
        }
        break;
      }

      case 'quoteStyleDiff': {
        // 21: 引用句的"随意感" - 同一篇文章出现两个引用句时用不同样式
        const quotes: string[] = result.match(/> .+/g) || [];
        if (quotes.length >= 2) {
          let usedStyles = false;
          result = result.replace(/> .+/g, (quote: string) => {
            if (!usedStyles && quotes.indexOf(quote) > 0) {
              usedStyles = true;
              return quote.replace(/^> /, '> §§QUOTE_ALT§§');
            }
            return quote;
          });
        }
        break;
      }

      case 'quoteIndentFloat': {
        // 21.2: 引用句缩进量随机浮动±5px
        result = result.replace(/§§QUOTE_INDENT§§/g, () => {
          const indent = randomInt(5, 15);
          return `§§QUOTE_INDENT_${indent}§§`;
        });
        break;
      }
    }
  }

  // 重新组合段落
  if (['shortParagraph', 'longParagraph', 'indentOccasion', 'highlightOccasion'].some(item => interference.triggered.includes(item))) {
    result = paragraphs.join('\n\n');
  }

  return result;
}

/**
 * ==================== 清理与格式化输出 ====================
 */

function cleanAndFormatOutput(content: string, dimensions: RandomDimensions): string {
  let result = content;

  // 清理特殊标记，转换为可读的Markdown格式
  // 这些标记在实际渲染时会被CSS类替代
  
  // 清理多余的空行
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // 清理行首行尾空白
  result = result.replace(/^\s+|\s+$/gm, '');
  
  // 清理连续标点
  result = result.replace(/[，。、；：]{3,}/g, '，');
  
  // 清理装饰符号（保留用于分隔的符号）
  result = result.replace(/[✦✧◆◇○●◉◐◑▪▫■□▲△▼▽▎▍▌▂▃▅▆▇━┅┆┇┊┋]+/g, ' ');
  
  // 清理图注文字残留
  result = result.replace(/图\d+[：:：]?\s*/g, '');
  result = result.replace(/配图\d+/g, '');
  result = result.replace(/（[^）]*图[^）]*）/g, '');
  result = result.replace(/\([^)]*图[^)]*\)/g, '');
  
  // 清理HTML残留
  result = result.replace(/<[^>]+>/g, '');
  
  // 清理代码符号残留
  result = result.replace(/[<>{}]/g, '');
  
  // 清理连续空行
  result = result.replace(/\n\n+/g, '\n\n');

  return result;
}

/**
 * ==================== 主函数：应用四层排版引擎 ====================
 */

export interface TypographyResult {
  content: string;
  dimensions: Record<string, any>;
  imageStyles?: {
    borderRadius: string;
    border: string;
    captionPosition: string;
    captionStyle: string;
    spacing: string;
  };
}

export function typographyEngine(
  content: string,
  themeColor: string = '#1890ff'
): TypographyResult {
  // 0. 生成随机维度组合
  const dimensions = generateRandomDimensions(themeColor);

  // 1. 基础规则（强制执行）
  let result = splitLongParagraphs(content);
  result = formatSectionTitles(result);
  result = formatSummarySentences(result);

  // 2. 第一层：结构骨架随机
  result = applyParagraphBreath(result, dimensions.layer1.paragraphBreath);
  result = applyLetterSpacing(result, dimensions.layer1.letterSpacing);
  result = applyLineSpacing(result, dimensions.layer1.lineSpacing);
  result = applyAlignment(result, dimensions.layer1.alignment);

  // 3. 第二层：细节纹理随机
  result = applyTitleStyle(result, dimensions.layer2.titleStyle);
  result = applyTitlePrefix(result, dimensions.layer2.titlePrefix);
  result = applyKeywordProcessing(result, dimensions.layer2.keywordProcessing);
  result = applyQuoteStyle(result, dimensions.layer2.quoteStyle);
  result = applySeparatorStyle(result, dimensions.layer2.separatorStyle);
  result = applyParagraphDecoration(result, dimensions.layer2.paragraphDecoration);
  result = applyListStyle(result, dimensions.layer2.listStyle);

  // 4. 第四层：拟人化干扰池（在最终清理前）
  result = applyHumanInterference(result, dimensions.layer4);

  // 5. 清理与格式化输出
  result = cleanAndFormatOutput(result, dimensions);

  // 6. 生成图片样式配置
  const imageStyles = getImageStyles(dimensions.layer3);

  return {
    content: result,
    dimensions: {
      // 第一层
      paragraphBreath: dimensions.layer1.paragraphBreath,
      letterSpacing: dimensions.layer1.letterSpacing,
      lineSpacing: dimensions.layer1.lineSpacing,
      alignment: dimensions.layer1.alignment,
      // 第二层
      titleStyle: dimensions.layer2.titleStyle,
      titlePrefix: dimensions.layer2.titlePrefix,
      keywordProcessing: dimensions.layer2.keywordProcessing,
      quoteStyle: dimensions.layer2.quoteStyle,
      separatorStyle: dimensions.layer2.separatorStyle,
      paragraphDecoration: dimensions.layer2.paragraphDecoration,
      listStyle: dimensions.layer2.listStyle,
      // 第三层
      imageBorderRadius: dimensions.layer3.imageBorderRadius,
      imageBorder: dimensions.layer3.imageBorder,
      imageCaptionPosition: dimensions.layer3.imageCaptionPosition,
      imageCaptionStyle: dimensions.layer3.imageCaptionStyle,
      imageSpacing: dimensions.layer3.imageSpacing,
      // 第四层
      interferenceEnabled: dimensions.layer4.enabled,
      interferenceTriggered: dimensions.layer4.triggered,
      // 主题色
      themeColor: dimensions.themeColor,
    },
    imageStyles,
  };
}

export default typographyEngine;
