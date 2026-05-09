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

// 高风险引导词 - 可能导致AI生成违规内容
const HIGH_RISK_WORDS = [
  '夸张', '夸大', '极致', '不设上限', '无限', '超级', '爆炸', '炸裂',
  '超低价', '亏本', '白送', '免费送', '无底洞', '逆天', '逆天改命',
  '吊打', '碾压', '秒杀', '完爆', '暴打', '超越', '突破极限', 
  '史上最强', '空前绝后', '绝无仅有', '无可比拟', '登峰造极',
  '极致到', '夸张点', '放大了说', '往死里夸', '疯狂吹', '超级吹',
  '吹上天', '吹到爆', '极致吹', '爆炸性', '史诗级'
];

/**
 * 提示词诊断结果接口
 */
export interface PromptDiagnosisResult {
  hasProblem: boolean;
  problemType: 'prohibited' | 'high_risk' | 'unknown' | 'none';
  prohibitedWords: Array<{
    word: string;
    category: string;
    position: number;
    context: string;
  }>;
  highRiskWords: Array<{
    word: string;
    position: number;
    context: string;
  }>;
  suggestions: string[];
  report: string;
}

/**
 * 诊断用户提示词
 * @param prompt 用户输入的提示词
 * @param finalViolationWords 最终仍未通过的违禁词列表（可选）
 * @returns 诊断结果
 */
export function diagnosePrompt(
  prompt: string,
  finalViolationWords?: string[]
): PromptDiagnosisResult {
  const result: PromptDiagnosisResult = {
    hasProblem: false,
    problemType: 'none',
    prohibitedWords: [],
    highRiskWords: [],
    suggestions: [],
    report: ''
  };

  if (!prompt || prompt.trim() === '') {
    result.report = '提示词为空，无法诊断';
    return result;
  }

  const lowerPrompt = prompt.toLowerCase();

  // 1. 检测明确违禁词
  const foundProhibited: Array<{ word: string; category: string; position: number; context: string }> = [];
  for (const word of ALL_PROHIBITED_WORDS) {
    const lowerWord = word.toLowerCase();
    let position = 0;
    while ((position = lowerPrompt.indexOf(lowerWord, position)) !== -1) {
      const start = Math.max(0, position - 10);
      const end = Math.min(prompt.length, position + word.length + 10);
      foundProhibited.push({
        word: word,
        category: getCategoryLabel(word),
        position: position,
        context: '...' + prompt.slice(start, end) + '...'
      });
      position += 1;
    }
  }

  if (foundProhibited.length > 0) {
    result.hasProblem = true;
    result.problemType = 'prohibited';
    result.prohibitedWords = foundProhibited;
    
    // 生成替换建议
    const suggestions: string[] = [];
    const replacements: Record<string, string> = {
      '最': '非常/特别',
      '第一': '领先/前列',
      '最好': '优质推荐',
      '最优': '出色表现',
      '顶级': '高端/优质',
      '国家级': '知名/专业',
      '独家': '特别推出',
      '唯一': '独特/精选',
      '首选': '推荐选择',
      '绝对': '非常/十分',
      '极佳': '表现出色',
      '完美': '出色/优秀',
      '极致': '出色/优质',
      '根治': '有效改善',
      '包治百病': '有助于调理',
      '无效退款': '不满意可联系我们',
      '稳赚不赔': '值得关注',
      '100%': '很高/优秀',
      '永久': '长期',
      '终身': '长期/持续'
    };

    for (const item of foundProhibited) {
      if (replacements[item.word]) {
        suggestions.push(`将"${item.word}"替换为"${replacements[item.word]}"`);
      } else {
        suggestions.push(`将"${item.word}"替换为合规表述`);
      }
    }
    result.suggestions = suggestions;

    // 生成报告
    const words = foundProhibited.map(v => v.word).join('、');
    result.report = `⚠️ 文章生成失败，原因：您的提示词包含了违规词汇。

提示词中存在以下问题：
- 违禁词：${words}
- 相关片段：${foundProhibited.map(v => `\n  "${v.context}"`).join('')}

修改建议：
${suggestions.map(s => `• ${s}`).join('\n')}

修改后请重新生成文章。`;

    return result;
  }

  // 2. 检测高风险引导词
  const foundHighRisk: Array<{ word: string; position: number; context: string }> = [];
  for (const word of HIGH_RISK_WORDS) {
    const lowerWord = word.toLowerCase();
    let position = 0;
    while ((position = lowerPrompt.indexOf(lowerWord, position)) !== -1) {
      const start = Math.max(0, position - 15);
      const end = Math.min(prompt.length, position + word.length + 15);
      foundHighRisk.push({
        word: word,
        position: position,
        context: '...' + prompt.slice(start, end) + '...'
      });
      position += 1;
    }
  }

  if (foundHighRisk.length > 0) {
    result.hasProblem = true;
    result.problemType = 'high_risk';
    result.highRiskWords = foundHighRisk;

    result.suggestions = [
      '避免使用诱导AI进行夸大承诺的词汇',
      '适当收敛表达，避免绝对化表述',
      '使用客观、理性的描述方式',
      '避免使用"夸张"、"极致"等强化词'
    ];

    result.report = `⚠️ 文章生成失败，原因：您的提示词中存在高风险引导语。

问题描述：以下提示词内容可能导致AI生成违规文章：
${foundHighRisk.map(v => `• "${v.context}"`).join('\n')}

修改建议：
${result.suggestions.map(s => `• ${s}`).join('\n')}

适当调整表达后重新生成。`;

    return result;
  }

  // 3. 如果有最终未通过的违禁词但提示词无明显问题
  if (finalViolationWords && finalViolationWords.length > 0) {
    result.problemType = 'unknown';
    result.report = `⚠️ 文章生成失败，原因：AI多次尝试修复后仍未通过审核。

最终未通过的违禁词：${finalViolationWords.join('、')}

建议：
• 尝试更换提示词中的部分表述方式后重新生成
• 避免使用可能触发审核的敏感话题
• 如需帮助，请在会员中心提交反馈，由人工核查`;

    return result;
  }

  // 4. 无明显问题
  result.problemType = 'none';
  result.report = `⚠️ 文章生成失败，原因：AI多次尝试修复后仍未通过审核。

建议：
• 请尝试更换提示词中的部分表述方式后重新生成
• 或联系我们进行人工排查`;

  return result;
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
    highRisk: HIGH_RISK_WORDS.length,
    total: ALL_PROHIBITED_WORDS.size
  };
}
