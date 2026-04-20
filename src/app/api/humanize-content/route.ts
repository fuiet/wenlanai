import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 降低AI率/人类化内容改写API - 保留原文，逐段改写
 */
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { success: false, error: '文章内容太短，无法进行改写' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 移除Markdown格式计算纯文字
    const cleanContent = content.replace(/[#*`_\[\]()>~]/g, '').trim();
    const charCount = cleanContent.length;

    // 将文章分段
    const paragraphs: string[] = content.split(/\n\n+/).filter((p: string) => p.trim().length > 20);
    
    // 构建强化的改写提示词
    const systemPrompt = `你是一位专业的人类化写作专家，擅长将AI生成的文章改写成真人写作风格。

## 改写要求（必须严格遵守）：

### 1. 保留原文结构
- 保留原文的段落数量
- 保留原文的标题（二级标题、三级标题等）
- 不要合并或拆分段落

### 2. 逐段改写，每段改写后标注改动
格式要求：
【段落X原文】: 原段落完整内容
【段落X改写】: 改写后内容
【改动说明】: 这个段落改了哪里，用了什么技巧

### 3. 改写技巧
- 添加语气词："说实话"、"其实"、"你知道吗"
- 添加感叹："太牛了！"、"真的绝了"
- 添加第一人称："我"、"我的"、"我自己"
- 加入具体真实细节：真实时间、地点、场景
- 加入真实情绪：开心、惊讶、无奈、担忧
- 打破机械过渡：删除"首先、其次、最后、总的来说"
- 删除空洞套话：删除"随着社会发展"、"众所周知"等

### 4. 字数控制
- 每个段落改写后字数与原文相差不超过20%
- 整篇文章改写后字数与原文相差不超过10%
- 原文约${charCount}字，改写后应控制在${Math.floor(charCount * 0.9)}-${Math.ceil(charCount * 1.1)}字

重要：必须逐段输出，格式严格遵守！`;

    // 构建用户消息
    const userContent = `请将以下文章的每个段落进行人类化改写。

原文内容（共${paragraphs.length}个段落）：

${paragraphs.map((p: string, i: number) => `[段落${i + 1}]\n${p}`).join('\n\n---\n\n')}

请按要求逐段改写，输出格式：每段输出【段落X原文】【段落X改写】【改动说明】。`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.9,
    });

    const resultText = response.content.trim();
    console.log('Humanize API response length:', resultText.length);
    
    // 解析改写结果
    // 提取每段的原文、改写和说明
    const rewrittenParagraphs: Array<{
      index: number;
      original: string;
      rewritten: string;
      changes: string[];
    }> = [];
    
    // 使用正则提取段落改写
    const pattern = /【段落(\d+)原文】\s*([\s\S]*?)【段落\d+改写】\s*([\s\S]*?)【改动说明】\s*([\s\S]*?)(?=【段落\d+原文】|$)/g;
    let match;
    
    while ((match = pattern.exec(resultText)) !== null) {
      const index = parseInt(match[1]) - 1;
      const original = match[2].trim();
      const rewritten = match[3].trim();
      const changes = match[4].split(/[、，,]/).map((c: string) => c.trim()).filter((c: string) => c.length > 0);
      
      rewrittenParagraphs.push({ index, original, rewritten, changes });
    }
    
    // 如果正则解析失败，尝试简单解析
    if (rewrittenParagraphs.length === 0) {
      // 尝试解析Markdown格式
      const lines = resultText.split('\n');
      let currentOriginal = '';
      let currentRewritten = '';
      let currentChanges: string[] = [];
      let currentIndex = 0;
      let mode: 'original' | 'rewritten' | 'changes' | 'idle' = 'idle';
      
      for (const line of lines) {
        if (line.includes('【段落') && line.includes('原文】')) {
          mode = 'original';
          const idx = line.match(/【段落(\d+)原文】/);
          if (idx) currentIndex = parseInt(idx[1]) - 1;
          currentOriginal = line.replace(/【段落\d+原文】/, '').trim();
        } else if (line.includes('【段落') && line.includes('改写】')) {
          mode = 'rewritten';
          currentRewritten = line.replace(/【段落\d+改写】/, '').trim();
        } else if (line.includes('【改动说明】')) {
          mode = 'changes';
          currentChanges = [line.replace('【改动说明】', '').trim()];
        } else if (line.trim() && mode !== 'idle') {
          if (mode === 'original') {
            currentOriginal += '\n' + line;
          } else if (mode === 'rewritten') {
            currentRewritten += '\n' + line;
          } else if (mode === 'changes') {
            currentChanges.push(line.replace(/^、/, '').trim());
          }
        }
      }
      
      if (currentOriginal && currentRewritten) {
        rewrittenParagraphs.push({
          index: currentIndex,
          original: currentOriginal,
          rewritten: currentRewritten,
          changes: currentChanges
        });
      }
    }
    
    // 组装完整改写后的文章
    let rewrittenContent = content; // 默认保留原文
    if (rewrittenParagraphs.length > 0) {
      // 按顺序替换原文段落
      const sortedParagraphs = [...rewrittenParagraphs].sort((a, b) => a.index - b.index);
      let result = content;
      
      for (const p of sortedParagraphs) {
        // 查找原文段落并替换
        const escapedOriginal = p.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedOriginal, 'g');
        result = result.replace(regex, p.rewritten);
      }
      
      // 如果替换不成功，尝试按段落顺序拼接
      if (result === content) {
        rewrittenContent = sortedParagraphs.map(p => p.rewritten).join('\n\n');
      } else {
        rewrittenContent = result;
      }
    }

    // 计算改写统计
    const changedCount = rewrittenParagraphs.length;
    const totalParagraphs = paragraphs.length;
    const humanizationScore = Math.round((changedCount / totalParagraphs) * 100);

    // 计算改动字数
    const originalClean = cleanContent;
    const rewrittenClean = rewrittenContent.replace(/[#*`_\[\]()>~]/g, '');
    const charDiff = Math.abs(rewrittenClean.length - originalClean.length);
    const charDiffPercent = Math.round((charDiff / originalClean) * 100);

    return NextResponse.json({
      success: true,
      rewrittenContent,
      originalContent: content, // 保留原文
      changedParagraphs: changedCount,
      totalParagraphs,
      humanizationScore,
      charDiff,
      charDiffPercent,
      changes: rewrittenParagraphs,
      keyTechniques: ['语气词添加', '第一人称', '具体细节', '真实情绪', '打破过渡', '删除套话'],
      finalTips: changedCount > 0 
        ? `已完成${changedCount}个段落的改写，字数变化${charDiffPercent <= 10 ? '在合理范围内' : '略大，建议手动调整'}。`
        : '未能解析改写结果，请重试。'
    });
  } catch (error) {
    console.error('内容改写失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '内容改写失败' },
      { status: 500 }
    );
  }
}
