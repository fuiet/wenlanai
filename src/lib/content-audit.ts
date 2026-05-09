/**
 * 内容安全审核工具
 * 包含违禁词库和内容扫描逻辑
 */

// 违禁词库 - 分类整理
export const PROHIBITED_WORDS = {
  // 极限用语
  extreme: [
    '最', '第一', '顶级', '国家级', '独家', '唯一', '首选', '最好', '最优',
    '绝对', '极佳', '极佳', '完美', '至上', '极致', '绝无仅有', '史无前例',
    '空前', '首创', '首发', '首度', '首次', '独家', '独享', '独占', '独一无二',
    '全网', '全球', '世界', '宇宙', '无敌', '最强', '至臻', '巅峰', '巅峰之作',
    '100%', '百分之百', '零风险', '零副作用', '无风险', '保证', '承诺',
    '永不', '永久', '一辈子', '终身', '毕生', '此生', '有生之年'
  ],
  
  // 虚假承诺
  falsePromise: [
    '根治', '包治百病', '彻底治愈', '永不复发', '保证治好', '无效退款',
    '稳赚不赔', '保本', '稳赚', '一本万利', '日赚', '月入', '年入',
    '快速致富', '一夜暴富', '躺赚', '躺赢', '稳赢', '包赚', '必赚',
    '立竿见影', '立刻见效', '马上见效', '三天见效', '七天见效'
  ],
  
  // 政治敏感
  political: [
    '国家领导人', '主席', '总书记', '总理', '总统', '首相',
    '反动', '颠覆', '分裂', '台独', '港独', '藏独', '疆独',
    '游行', '示威', '抗议', '罢工'
  ],
  
  // 低俗色情
  vulgar: [
    'sex', '色情', '黄色', '淫秽', '三级片', 'AV女优', 'AV男优',
    '裸聊', '约炮', '一夜情', '援交', '买春', '卖淫', '嫖娼',
    '性暗示', '性骚扰', '走光', '透视', '透视装'
  ],
  
  // 医疗相关
  medical: [
    '疗效最佳', '药效最强', '治愈率', '有效率', '死亡率',
    '偏方', '秘方', '神医', '华佗', '扁鹊', '本草纲目',
    '壮阳', '补肾', '增高', '丰乳', '隆胸', '整容'
  ],
  
  // 金融投资
  financial: [
    '高回报', '高收益', '低风险高收益', '保本高收益',
    '内幕消息', '庄家', '割韭菜', '老鼠仓'
  ]
};

// 合并所有违禁词为一个Set用于快速查找
const ALL_PROHIBITED_WORDS = new Set([
  ...PROHIBITED_WORDS.extreme,
  ...PROHIBITED_WORDS.falsePromise,
  ...PROHIBITED_WORDS.political,
  ...PROHIBITED_WORDS.vulgar,
  ...PROHIBITED_WORDS.medical,
  ...PROHIBITED_WORDS.financial
]);

/**
 * 获取违禁词分类标签
 */
function getCategoryLabel(word: string): string {
  if (PROHIBITED_WORDS.extreme.includes(word)) return '极限用语';
  if (PROHIBITED_WORDS.falsePromise.includes(word)) return '虚假承诺';
  if (PROHIBITED_WORDS.political.includes(word)) return '政治敏感';
  if (PROHIBITED_WORDS.vulgar.includes(word)) return '低俗色情';
  if (PROHIBITED_WORDS.medical.includes(word)) return '医疗违规';
  if (PROHIBITED_WORDS.financial.includes(word)) return '金融违规';
  return '未知类别';
}

/**
 * 内容审核结果接口
 */
export interface ContentAuditResult {
  passed: boolean;
  violations: Array<{
    word: string;
    category: string;
    position: number;
  }>;
  summary: string;
}

/**
 * 扫描文本内容，检测违禁词
 * @param content 要扫描的文本内容
 * @returns 审核结果
 */
export function scanContent(content: string): ContentAuditResult {
  const violations: ContentAuditResult['violations'] = [];
  
  if (!content || content.trim() === '') {
    return {
      passed: true,
      violations: [],
      summary: '内容为空，跳过审核'
    };
  }
  
  // 转换为小写进行不区分大小写的匹配
  const lowerContent = content.toLowerCase();
  
  // 检测每个违禁词
  for (const word of ALL_PROHIBITED_WORDS) {
    const lowerWord = word.toLowerCase();
    let position = 0;
    
    while ((position = lowerContent.indexOf(lowerWord, position)) !== -1) {
      violations.push({
        word: word,
        category: getCategoryLabel(word),
        position: position
      });
      position += 1; // 继续查找下一个匹配
    }
  }
  
  // 去重（同一个词出现多次只保留一次）
  const uniqueViolations = violations.reduce((acc, v) => {
    const exists = acc.find(x => x.word === v.word);
    if (!exists) {
      acc.push(v);
    }
    return acc;
  }, [] as typeof violations);
  
  return {
    passed: uniqueViolations.length === 0,
    violations: uniqueViolations,
    summary: uniqueViolations.length === 0 
      ? '内容审核通过' 
      : `发现 ${uniqueViolations.length} 个违禁词`
  };
}

/**
 * 审核文章完整内容（标题 + 正文 + 摘要）
 * @param title 文章标题
 * @param body 文章正文
 * @param summary 文章摘要（可选）
 * @returns 审核结果
 */
export function auditArticle(
  title: string,
  body: string,
  summary?: string
): ContentAuditResult {
  // 合并所有内容进行扫描
  const fullContent = [title, body, summary].filter(Boolean).join('\n');
  
  const result = scanContent(fullContent);
  
  // 如果发现问题，标记具体位置
  if (!result.passed) {
    const violationWords = result.violations.map(v => v.word).join('、');
    result.summary = `内容审核不通过，文章包含违规内容：[${violationWords}]，请修改提示词或选题后重新生成`;
  }
  
  return result;
}

/**
 * 快速检查文本是否包含违禁词
 * @param content 要检查的文本
 * @returns true 表示包含违禁词
 */
export function hasProhibitedWords(content: string): boolean {
  return !scanContent(content).passed;
}

/**
 * 获取违禁词库统计
 */
export function getProhibitedWordsStats() {
  return {
    extreme: PROHIBITED_WORDS.extreme.length,
    falsePromise: PROHIBITED_WORDS.falsePromise.length,
    political: PROHIBITED_WORDS.political.length,
    vulgar: PROHIBITED_WORDS.vulgar.length,
    medical: PROHIBITED_WORDS.medical.length,
    financial: PROHIBITED_WORDS.financial.length,
    total: ALL_PROHIBITED_WORDS.size
  };
}
