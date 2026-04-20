'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PenTool,
  Wand2,
  Save,
  FileText,
  User,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Image as ImageIcon,
  Globe,
  Send,
  RotateCcw,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bot,
  UserCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

// 提示词数据结构
interface Prompt {
  id: number;
  name: string;
  category: string;
  description: string;
  prompt: string;
  tags: string[];
  isCustom: boolean;
}

// 字数统计指示器组件
function WordCountIndicator({ actual, target, minDiff }: { actual: number; target: number; minDiff: number }) {
  const diff = actual - target;
  const isInRange = Math.abs(diff) <= minDiff;
  const isOver = diff > 0;
  const isUnder = diff < 0;
  
  let colorClass = 'bg-green-500';
  let text = '符合要求';
  
  if (!isInRange) {
    if (isOver) {
      colorClass = 'bg-red-500';
      text = `超出${diff}字`;
    } else {
      colorClass = 'bg-yellow-500';
      text = `差${Math.abs(diff)}字`;
    }
  }
  
  return (
    <Badge className={`${colorClass} text-white text-sm`}>
      {text}
    </Badge>
  );
}

// AI检测结果类型
interface ParagraphDetect {
  index: number;
  content: string;
  source: string;
  aiFeatures: string[];
  confidence: number;
  reasons: string[];
  suggestions: string[];
}

interface DetectResult {
  aiRate: number;
  riskLevel: string;
  paragraphCount: number;
  totalParagraphs: number;
  aiParagraphs: number;
  humanParagraphs: number;
  summary: string;
  confidence: number;
  paragraphs: ParagraphDetect[];
}

// 模拟默认提示词数据
const defaultPrompts: Prompt[] = [
  {
    id: 1,
    name: '情感类爆款文案',
    category: '情感',
    description: '擅长写触动人心的情感类文章',
    prompt: '你是一位情感类自媒体写作专家，擅长创作触动人心、引发共鸣的爆款文章。你的写作风格温暖细腻，善于通过生活细节和真实情感打动读者。请根据提供的主题，创作一篇具有强烈感染力的情感类文章，要求：1. 开头吸引人 2. 内容有共鸣 3. 结尾有升华',
    tags: ['情感', '爆款', '共鸣'],
    isCustom: false,
  },
  {
    id: 2,
    name: '职场成长导师',
    category: '职场',
    description: '职场经验分享，帮助职场人成长',
    prompt: '你是一位资深职场导师，拥有10年以上HR和职场管理经验。你擅长分享实用的职场干货和成长建议，帮助职场人解决工作难题。请根据提供的主题，创作一篇有深度、有价值的职场类文章，要求：1. 案例真实 2. 方法实用 3. 建议可操作',
    tags: ['职场', '干货', '成长'],
    isCustom: false,
  },
  {
    id: 3,
    name: '星座运势分析师',
    category: '星座',
    description: '专业的星座分析和运势预测',
    prompt: '你是一位专业的星座分析师，精通十二星座的性格特点和运势规律。你的分析准确、有趣，深受粉丝喜爱。请根据提供的星座和时间，进行详细的星座分析，包括：性格特点、近期运势、注意事项、建议等',
    tags: ['星座', '运势', '分析'],
    isCustom: false,
  },
  {
    id: 4,
    name: '汽车评测专家',
    category: '汽车',
    description: '专业的汽车评测和购车建议',
    prompt: '你是一位资深的汽车评测专家，拥有丰富的汽车行业经验。你擅长从消费者角度出发，提供客观、实用的汽车评测和购车建议。请根据提供的车型或需求，创作一篇专业的汽车类文章，要求：1. 数据准确 2. 分析客观 3. 建议实用',
    tags: ['汽车', '评测', '购车'],
    isCustom: false,
  },
  {
    id: 5,
    name: '我的个人风格',
    category: '自定义',
    description: '自定义的写作风格',
    prompt: '你是一位自媒体写作专家，擅长创作轻松、有趣、实用的内容。你的风格幽默风趣，善于用生动的比喻和案例。请根据主题创作内容。',
    tags: ['自定义', '幽默', '实用'],
    isCustom: true,
  },
];

function SmartWritingContent() {
  const searchParams = useSearchParams();
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [customPromptText, setCustomPromptText] = useState(''); // 从URL传递的自定义提示词
  const [title, setTitle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true); // 默认启用联网搜索
  const [prompts, setPrompts] = useState<Prompt[]>(defaultPrompts);
  
  // AI检测相关状态
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [showDetectPanel, setShowDetectPanel] = useState(false);
  
  // 人类化改写相关状态
  const [humanizeResult, setHumanizeResult] = useState<{
    originalContent: string;
    rewrittenContent: string;
    changes: Array<{
      index: number;
      original: string;
      rewritten: string;
      changes: string[];
    }>;
    humanizationScore: number;
    changedParagraphs: number;
  } | null>(null);
  
  const streamRef = useRef(false);

  // 从 localStorage 读取提示词数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wenlan-prompts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPrompts(parsed);
          }
        } catch {
          // 使用默认数据
        }
      }
    }
  }, []);

  // 从URL参数中获取标题和提示词
  useEffect(() => {
    const titleParam = searchParams.get('title');
    const promptParam = searchParams.get('prompt');
    const promptIdParam = searchParams.get('promptId');

    if (titleParam) {
      setTitle(decodeURIComponent(titleParam));
    }

    if (promptParam) {
      // 从URL参数中获取自定义提示词内容
      const decodedPrompt = decodeURIComponent(promptParam);
      setCustomPromptText(decodedPrompt);
      
      // 如果URL中有promptId，尝试匹配并选中
      if (promptIdParam) {
        const id = parseInt(promptIdParam);
        const foundPrompt = prompts.find(p => p.id === id);
        if (foundPrompt) {
          setSelectedPrompt(id.toString());
        }
      }
    }
  }, [searchParams, prompts]);

  const handleGenerate = async () => {
    if (!title.trim()) {
      alert('请输入文章标题');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    streamRef.current = true;

    try {
      // 优先使用从URL传递的自定义提示词，否则使用选中的提示词
      const promptToUse = customPromptText || (
        selectedPrompt 
          ? (prompts.find((p) => p.id === parseInt(selectedPrompt))?.prompt || '')
          : ''
      );

      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          prompt: promptToUse,
          searchEnabled, // 传递联网搜索开关
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (streamRef.current) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                streamRef.current = false;
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setGeneratedContent(fullContent);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // 文章生成完成后，自动生成图片
        if (fullContent) {
          setGeneratedContent(fullContent);
          await handleAutoGenerateImage(fullContent);
        }
      }
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成文章失败，请稍后重试');
    } finally {
      setIsGenerating(false);
      streamRef.current = false;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleSaveDraft = () => {
    if (!generatedContent.trim()) {
      alert('没有可保存的内容');
      return;
    }
    // TODO: 实现保存到公众号草稿箱的功能
    alert('草稿已保存到公众号草稿箱');
  };

  // 清空内容，重新生成
  const handleReset = () => {
    if (!generatedContent.trim()) {
      return; // 没有内容不需要清空
    }
    
    // 确认是否清空
    if (!confirm('确定要清空当前文章吗？清空后可以重新生成。')) {
      return;
    }
    
    setGeneratedContent('');
    setImageUrls([]);
    setPushSuccess(false);
    setCopied(false);
  };

  // 一键推送到公众号草稿箱
  const handlePushDraft = async () => {
    if (!generatedContent.trim()) {
      alert('没有可推送的内容');
      return;
    }

    setIsPushing(true);
    setPushSuccess(false);

    try {
      // 提取文章中的图片URL（用于推送到公众号）
      const imageMatches = generatedContent.match(/!\[.*?\]\((.*?)\)/g) || [];
      const pushImageUrls = imageMatches.map((match) => {
        const urlMatch = match.match(/\((.*?)\)/);
        return urlMatch ? urlMatch[1] : '';
      }).filter(Boolean);

      // 调用推送API
      const response = await fetch('/api/push-to-wechat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || '未命名文章',
          content: generatedContent,
          imageUrls: pushImageUrls,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPushSuccess(true);
        alert(`推送成功！文章已发送到公众号草稿箱`);
      } else {
        alert(result.message || '推送失败，请稍后重试');
      }
    } catch (error) {
      console.error('推送失败:', error);
      alert('推送失败，请稍后重试');
    } finally {
      setIsPushing(false);
    }
  };

  // 将图片随机插入到文章中
  const insertImagesToContent = (content: string, images: string[]): string => {
    if (!content || images.length === 0) return content;

    // 将文章按段落分割
    const paragraphs = content.split('\n\n');
    const imagePositions: number[] = [];

    // 确定图片插入位置（随机，但确保分布均匀）
    const totalParagraphs = paragraphs.length;
    const minSpacing = Math.floor(totalParagraphs / (images.length + 1));

    for (let i = 0; i < images.length; i++) {
      // 计算每个图片的位置，确保均匀分布
      const minPos = (i + 1) * minSpacing;
      const maxPos = Math.min(minPos + minSpacing - 1, totalParagraphs - 1);
      // 随机选择位置
      const pos = Math.floor(Math.random() * (maxPos - minPos + 1)) + minPos;
      imagePositions.push(pos);
    }

    // 按位置排序，确保插入顺序正确
    imagePositions.sort((a, b) => a - b);

    // 插入图片
    let result = '';
    let imageIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      result += paragraphs[i];

      // 如果当前位置需要插入图片
      if (imageIndex < imagePositions.length && i === imagePositions[imageIndex]) {
        const imageUrl = images[imageIndex];
        // 使用Markdown格式插入图片
        result += `\n\n![插图${imageIndex + 1}](${imageUrl})\n\n`;
        imageIndex++;
      }

      // 添加段落分隔
      if (i < paragraphs.length - 1) {
        result += '\n\n';
      }
    }

    return result;
  };

  // 自动生成插图（根据文章内容）
  const handleAutoGenerateImage = async (content?: string) => {
    const articleContent = content || generatedContent;
    if (!articleContent) {
      return;
    }

    setIsGeneratingImage(true);

    try {
      const response = await fetch('/api/generate-article-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content: articleContent,
          count: 3,
        }),
      });

      if (!response.ok) {
        throw new Error('生成图片失败');
      }

      const data = await response.json();

      if (data.success && data.imageUrls && data.imageUrls.length > 0) {
        setImageUrls(data.imageUrls);

        // 将图片随机插入到文章内容中
        const contentWithImages = insertImagesToContent(articleContent, data.imageUrls);
        setGeneratedContent(contentWithImages);
      }
    } catch (error) {
      console.error('自动生成图片失败:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!title.trim() && !generatedContent.trim()) {
      alert('请先生成文章内容');
      return;
    }

    setIsGeneratingImage(true);
    setImageUrls([]);

    try {
      const response = await fetch('/api/generate-article-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content: generatedContent,
          count: 3, // 生成3张图片
        }),
      });

      if (!response.ok) {
        throw new Error('生成图片失败');
      }

      const data = await response.json();

      if (data.success && data.imageUrls && data.imageUrls.length > 0) {
        setImageUrls(data.imageUrls);

        // 将图片随机插入到文章内容中
        const contentWithImages = insertImagesToContent(generatedContent, data.imageUrls);
        setGeneratedContent(contentWithImages);
      } else {
        throw new Error(data.error || '生成图片失败');
      }
    } catch (error) {
      console.error('生成图片失败:', error);
      alert('生成图片失败，请稍后重试');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // AI检测
  const handleDetectAI = async () => {
    if (!generatedContent.trim()) {
      alert('请先生成文章内容');
      return;
    }

    setIsDetecting(true);
    setDetectResult(null);
    setShowDetectPanel(true);

    try {
      const response = await fetch('/api/detect-ai-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedContent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDetectResult(data);
      } else {
        alert(data.error || '检测失败，请重试');
        setShowDetectPanel(false);
      }
    } catch (error) {
      console.error('AI检测失败:', error);
      alert('检测失败，请稍后重试');
      setShowDetectPanel(false);
    } finally {
      setIsDetecting(false);
    }
  };

  // 降低AI率
  const handleHumanize = async () => {
    if (!generatedContent.trim()) {
      alert('请先生成文章内容');
      return;
    }

    setIsHumanizing(true);

    try {
      const response = await fetch('/api/humanize-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedContent,
        }),
      });

      const data = await response.json();
      console.log('Humanize response:', data);

      if (data.success && data.rewrittenContent) {
        // 保存改写结果
        setHumanizeResult({
          originalContent: data.originalContent || generatedContent,
          rewrittenContent: data.rewrittenContent,
          changes: data.changes || [],
          humanizationScore: data.humanizationScore || 0,
          changedParagraphs: data.changedParagraphs || 0,
        });
        
        // 自动切换到改写对比视图
        setShowHumanizeCompare(true);
        
        // 自动切换到detect tab
        setShowDetectPanel(true);
        
        alert(`改写完成！\n人类化程度：${data.humanizationScore}%\n改写了${data.changedParagraphs}个段落\n\n请查看下方改写对比，确认后点击"应用改写"按钮`);
      } else {
        alert(data.error || data.hint || '改写失败，请重试');
      }
    } catch (error) {
      console.error('降低AI率失败:', error);
      alert('改写失败，请稍后重试');
    } finally {
      setIsHumanizing(false);
    }
  };
  
  // 应用改写结果
  const handleApplyHumanize = () => {
    if (humanizeResult) {
      setGeneratedContent(humanizeResult.rewrittenContent);
      setHumanizeResult(null);
      setShowHumanizeCompare(false);
      alert('改写已应用！');
      
      // 重新检测
      setTimeout(() => handleDetectAI(), 500);
    }
  };
  
  // 取消改写
  const handleCancelHumanize = () => {
    setHumanizeResult(null);
    setShowHumanizeCompare(false);
  };
  
  // 显示改写对比面板
  const [showHumanizeCompare, setShowHumanizeCompare] = useState(false);

  // 复制检测报告
  const handleCopyReport = () => {
    if (!detectResult) return;
    
    const report = `
AI内容检测报告
================
综合AI率：${detectResult.aiRate}%
风险等级：${detectResult.riskLevel}
总段落数：${detectResult.totalParagraphs}
AI段落：${detectResult.aiParagraphs}
人工段落：${detectResult.humanParagraphs}

总体评估：${detectResult.summary}

段落详情：
${detectResult.paragraphs?.map((p: DetectResult['paragraphs'][0]) => `
【段落${p.index + 1}】
来源：${p.source}
置信度：${p.confidence}%
原因：${p.reasons?.join('、') || '无'}
${p.suggestions ? '建议：' + p.suggestions : ''}
`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(report);
    alert('报告已复制到剪贴板');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 flex items-center">
          <PenTool className="mr-3 h-8 w-8 text-purple-500" />
          智能生文
        </h1>
        <p className="text-gray-600">选择提示词人设，输入标题，AI 自动生成爆款文章</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Panel - Input */}
        <div className="space-y-6">
          {/* Prompt Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" />
                选择提示词
              </CardTitle>
              <CardDescription>选择适合的写作提示词，AI将根据提示词生成文章</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                <SelectTrigger>
                  <SelectValue placeholder="选择提示词" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {prompt.category}
                        </Badge>
                        <span>{prompt.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customPromptText && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium mb-1">已加载自定义提示词</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{customPromptText}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Title Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                文章标题
              </CardTitle>
              <CardDescription>输入文章标题，AI 将根据标题生成内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="例如：为什么你总是遇不到对的人？这3个真相扎心了"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    handleGenerate();
                  }
                }}
                disabled={isGenerating}
              />
              
              {/* 联网搜索开关 */}
              <div className="flex items-center justify-between rounded-lg border p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-green-600" />
                  <div className="space-y-0.5">
                    <Label htmlFor="search-mode" className="text-sm font-medium cursor-pointer">
                      实时联网搜索
                    </Label>
                    <p className="text-xs text-gray-500">
                      {searchEnabled ? '已启用：AI将搜索最新数据生成准确文章' : '已禁用：使用通用知识生成文章'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="search-mode"
                  checked={searchEnabled}
                  onCheckedChange={setSearchEnabled}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {searchEnabled ? '正在联网搜索并生成...' : '正在生成...'}
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-5 w-5" />
                {searchEnabled ? '联网搜索并生成文章' : '生成文章'}
              </>
            )}
          </Button>

          {/* Action Buttons */}
          {generatedContent && (
            <div className="flex gap-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                清空重写
              </Button>
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    复制内容
                  </>
                )}
              </Button>
              <Button
                onClick={handleGenerateImage}
                variant="outline"
                className="flex-1"
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    生成插图
                  </>
                )}
              </Button>
              <Button
                onClick={handlePushDraft}
                disabled={isPushing}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    推送中...
                  </>
                ) : pushSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    已推送
                  </>
                ) : (
                  <span className="flex items-center">
                    <img 
                      src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2Fimage.png&nonce=ac7b2e9a-b02e-4eb0-89b9-5b77ac909da2&project_id=7626301097891610687&sign=b8a8799c6cf1f5d4977ccbcc3759ef23592d9cac6dc1eb1f7786d0f635ee0d00" 
                      alt="" 
                      className="mr-2 h-4 w-4 object-contain" 
                    />
                    一键推送
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* AI检测区域 */}
          {generatedContent && (
            <Card className="border-2 border-gradient-to-r from-cyan-500 to-blue-500 bg-gradient-to-r from-cyan-50 to-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-cyan-600" />
                  AI检测
                  {detectResult && (
                    <Badge className={`ml-2 ${
                      detectResult.riskLevel === '高风险' ? 'bg-red-500' :
                      detectResult.riskLevel === '中风险' ? 'bg-yellow-500' : 'bg-green-500'
                    } text-white`}>
                      {detectResult.aiRate}% AI率
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500">
                  检测文章AI特征，标记可疑段落，降低AI率让文章更自然
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDetectAI}
                    disabled={isDetecting || isHumanizing}
                    variant="outline"
                    className="flex-1 border-cyan-300 text-cyan-700 hover:bg-cyan-100"
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        检测中...
                      </>
                    ) : (
                      <>
                        <Bot className="mr-2 h-4 w-4" />
                        AI检测
                      </>
                    )}
                  </Button>
                  {detectResult && detectResult.aiRate > 30 && (
                    <Button
                      onClick={handleHumanize}
                      disabled={isDetecting || isHumanizing}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      {isHumanizing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          改写中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          降低AI率
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {/* 快速检测结果 */}
                {showDetectPanel && (
                  <div className="mt-3 rounded-lg bg-white/80 p-3">
                    {isDetecting ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                        <span className="ml-2 text-sm text-gray-500">正在分析文章...</span>
                      </div>
                    ) : detectResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">综合AI率</span>
                          <span className={`font-bold ${
                            detectResult.aiRate > 60 ? 'text-red-500' :
                            detectResult.aiRate > 30 ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                            {detectResult.aiRate}%
                          </span>
                        </div>
                        <Progress 
                          value={detectResult.aiRate} 
                          className={`h-2 ${
                            detectResult.aiRate > 60 ? '[&>div]:bg-red-500' :
                            detectResult.aiRate > 30 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
                          }`}
                        />
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>AI段落: {detectResult.aiParagraphs}</span>
                          <span>|</span>
                          <span>人工段落: {detectResult.humanParagraphs}</span>
                          <span>|</span>
                          <span className={`font-medium ${
                            detectResult.riskLevel === '高风险' ? 'text-red-500' :
                            detectResult.riskLevel === '中风险' ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                            {detectResult.riskLevel}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2">
            <CardContent className="py-6">
              <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                使用技巧
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>开启联网搜索</strong>：AI会搜索最新数据，生成内容更准确、更时效</li>
                <li>• 选择合适的提示词，让文章更符合目标读者</li>
                <li>• 标题要吸引人，包含关键词或引发好奇</li>
                <li>• 文章会自动生成，字数控制在1000字左右</li>
                <li>• 点击&ldquo;生成插图&rdquo;可生成2-3张插图并自动插入文章</li>
                <li>• 插图会随机分布在文章段落之间</li>
                <li>• 完成后可保存到公众号草稿箱</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Output */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                文章预览
              </div>
              {generatedContent && (
                <Badge className="bg-green-100 text-green-700">
                  Markdown 格式
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {generatedContent ? '生成的文章内容' : '文章将在这里显示...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <>
                {/* Tabs for article and detection report */}
                <Tabs value={showDetectPanel && detectResult ? 'detect' : 'article'} onValueChange={(v) => {
                  if (v === 'detect') {
                    if (!detectResult) {
                      handleDetectAI();
                    } else {
                      setShowDetectPanel(true);
                    }
                  } else {
                    setShowDetectPanel(false);
                  }
                }} className="mb-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="article">文章内容</TabsTrigger>
                    <TabsTrigger value="detect">
                      AI检测报告
                      {detectResult && (
                        <Badge className={`ml-1 ${
                          detectResult.aiRate > 60 ? 'bg-red-500' :
                          detectResult.aiRate > 30 ? 'bg-yellow-500' : 'bg-green-500'
                        } text-white text-xs`}>
                          {detectResult.aiRate}%
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="article" className="mt-3">
                    {/* 字数统计 - 计算实际中文字符数 */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        实际字数: {generatedContent.replace(/[#*`_\[\]()]/g, '').length}
                      </Badge>
                      <Badge variant="outline" className="text-sm">
                        目标: 1000±100字
                      </Badge>
                      <WordCountIndicator actual={generatedContent.replace(/[#*`_\[\]()]/g, '').length} target={1000} minDiff={100} />
                      {imageUrls.length > 0 && (
                        <Badge variant="outline" className="text-sm">
                          插图: {imageUrls.length}张
                        </Badge>
                      )}
                      {/* 降低AI率按钮 - 在文章内容Tab中直接显示 */}
                      {generatedContent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleHumanize}
                          disabled={isHumanizing}
                          className="text-cyan-500 hover:text-cyan-600"
                        >
                          {isHumanizing ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              改写中...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-1 h-3 w-3" />
                              降低AI率
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* 改写结果预览 - 当有改写结果时显示 */}
                    {showHumanizeCompare && humanizeResult && (
                      <div className="mb-4 space-y-3 rounded-lg border-2 border-green-200 bg-green-50 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-green-800">改写对比</h3>
                          <Badge className="bg-green-500 text-white">
                            已改写{humanizeResult.changedParagraphs}个段落
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-green-700">
                          人类化程度: <span className="font-semibold">{humanizeResult.humanizationScore}%</span>
                        </p>
                        
                        {/* 操作按钮 */}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleApplyHumanize}
                            size="sm"
                            className="flex-1 bg-green-500 hover:bg-green-600"
                          >
                            <Check className="mr-1 h-4 w-4" />
                            应用改写
                          </Button>
                          <Button
                            onClick={handleCancelHumanize}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            取消
                          </Button>
                        </div>
                        
                        {/* 逐段对比 */}
                        <ScrollArea className="max-h-48 rounded-lg border bg-white p-3">
                          <div className="space-y-3">
                            {humanizeResult.changes.map((change, idx) => (
                              <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <Badge variant="outline" className="text-xs">段落 {change.index + 1}</Badge>
                                  <span className="text-gray-400">{change.changes.length}处改动</span>
                                </div>
                                
                                <div className="mb-1">
                                  <p className="text-xs text-red-600">原文:</p>
                                  <p className="text-xs text-gray-700 line-clamp-2">{change.original}</p>
                                </div>
                                
                                <div className="mb-1">
                                  <p className="text-xs text-green-600">改写后:</p>
                                  <p className="text-xs text-gray-700 line-clamp-2">{change.rewritten}</p>
                                </div>
                                
                                {change.changes.length > 0 && (
                                  <p className="text-xs text-gray-500">改动: {change.changes.slice(0, 3).join('、')}{change.changes.length > 3 ? '...' : ''}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        
                        {/* 完整预览 */}
                        <div>
                          <p className="mb-2 text-xs font-medium text-gray-700">完整改写预览:</p>
                          <ScrollArea className="max-h-32 rounded-lg border bg-white p-2">
                            <div className="prose prose-sm max-w-none text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {humanizeResult.rewrittenContent}
                              </ReactMarkdown>
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    )}

                    {/* Markdown内容 */}
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-center prose-headings:font-bold prose-h1:text-center prose-h1:font-bold">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          // 自定义图片组件，优化显示
                          img: ({ src, alt, ...props }) => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { width: _width, height: _height, ...restProps } = props;
                            const imageAlt = typeof alt === 'string' ? alt : String(alt || '插图');
                            return (
                              <div className="my-4 flex justify-center">
                                <Image
                                  src={typeof src === 'string' ? src : ''}
                                  alt={imageAlt}
                                  width={800}
                                  height={450}
                                  className="rounded-lg shadow-md"
                                  {...restProps}
                                />
                              </div>
                            );
                          },
                        }}
                      >
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {generatedContent as any}
                      </ReactMarkdown>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="detect" className="mt-3">
                    {isDetecting ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                        <p className="mt-3 text-sm text-gray-500">正在分析文章AI特征...</p>
                      </div>
                    ) : detectResult ? (
                      <ScrollArea className="h-[500px] pr-4">
                        {/* 检测概览 */}
                        <div className="mb-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold">综合AI检测报告</h3>
                            <Button size="sm" variant="ghost" onClick={handleCopyReport}>
                              <Copy className="mr-1 h-3 w-3" />
                              复制报告
                            </Button>
                          </div>
                          
                          <div className="mb-4 text-center">
                            <div className={`text-4xl font-bold ${
                              detectResult.aiRate > 60 ? 'text-red-500' :
                              detectResult.aiRate > 30 ? 'text-yellow-500' : 'text-green-500'
                            }`}>
                              {detectResult.aiRate}%
                            </div>
                            <p className="text-sm text-gray-500">综合AI率</p>
                          </div>
                          
                          <Progress 
                            value={detectResult.aiRate} 
                            className={`mb-4 h-3 ${
                              detectResult.aiRate > 60 ? '[&>div]:bg-red-500' :
                              detectResult.aiRate > 30 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
                            }`}
                          />
                          
                          <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="rounded bg-white p-2">
                              <div className="text-lg font-bold text-red-500">{detectResult.aiParagraphs}</div>
                              <div className="text-xs text-gray-500">AI段落</div>
                            </div>
                            <div className="rounded bg-white p-2">
                              <div className="text-lg font-bold text-green-500">{detectResult.humanParagraphs}</div>
                              <div className="text-xs text-gray-500">人工段落</div>
                            </div>
                            <div className={`rounded bg-white p-2 ${
                              detectResult.riskLevel === '高风险' ? 'ring-2 ring-red-500' :
                              detectResult.riskLevel === '中风险' ? 'ring-2 ring-yellow-500' : 'ring-2 ring-green-500'
                            }`}>
                              <div className={`text-lg font-bold ${
                                detectResult.riskLevel === '高风险' ? 'text-red-500' :
                                detectResult.riskLevel === '中风险' ? 'text-yellow-500' : 'text-green-500'
                              }`}>{detectResult.riskLevel}</div>
                              <div className="text-xs text-gray-500">风险等级</div>
                            </div>
                          </div>
                          
                          <p className="mt-3 text-sm text-gray-600">{detectResult.summary}</p>
                        </div>
                        
                        {/* 段落详情 */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700">段落详情</h4>
                          {detectResult.paragraphs?.map((p: DetectResult['paragraphs'][0]) => (
                            <div 
                              key={p.index} 
                              className={`rounded-lg border p-3 ${
                                p.source === 'AI生成' ? 'border-red-200 bg-red-50' :
                                p.source === '人工写作' ? 'border-green-200 bg-green-50' :
                                'border-yellow-200 bg-yellow-50'
                              }`}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    className={`text-xs ${
                                      p.source === 'AI生成' ? 'bg-red-500' :
                                      p.source === '人工写作' ? 'bg-green-500' : 'bg-yellow-500'
                                    } text-white`}
                                  >
                                    {p.source === 'AI生成' && <Bot className="mr-1 h-3 w-3" />}
                                    {p.source === '人工写作' && <UserCheck className="mr-1 h-3 w-3" />}
                                    {p.source}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    置信度: {p.confidence}%
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                  段落 {p.index + 1}
                                </span>
                              </div>
                              
                              <p className="mb-2 text-sm text-gray-700 line-clamp-3">
                                {p.content?.substring(0, 150)}
                                {p.content?.length > 150 && '...'}
                              </p>
                              
                              {p.reasons && p.reasons.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-gray-500">AI特征: </span>
                                  <span className="text-xs text-red-600">
                                    {p.reasons.join('、')}
                                  </span>
                                </div>
                              )}
                              
                              {p.suggestions && (
                                <div className="rounded bg-white/50 p-2">
                                  <span className="text-xs font-medium text-gray-500">修改建议: </span>
                                  <span className="text-xs text-gray-600">{p.suggestions}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* 改写对比面板 - 当有改写结果时显示 */}
                        {showHumanizeCompare && humanizeResult && (
                          <div className="mt-4 space-y-4 rounded-lg border-2 border-green-200 bg-green-50 p-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-green-800">改写对比</h3>
                              <Badge className="bg-green-500 text-white">
                                已改写{humanizeResult.changedParagraphs}个段落
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-green-700">
                              人类化程度: <span className="font-semibold">{humanizeResult.humanizationScore}%</span>
                            </p>
                            
                            {/* 操作按钮 */}
                            <div className="flex gap-2">
                              <Button
                                onClick={handleApplyHumanize}
                                className="flex-1 bg-green-500 hover:bg-green-600"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                应用改写
                              </Button>
                              <Button
                                onClick={handleCancelHumanize}
                                variant="outline"
                                className="flex-1"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                取消
                              </Button>
                            </div>
                            
                            {/* 改写详情 */}
                            <ScrollArea className="max-h-64 rounded-lg border bg-white p-3">
                              <div className="space-y-4">
                                {humanizeResult.changes.map((change, idx) => (
                                  <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                      <Badge variant="outline">段落 {change.index + 1}</Badge>
                                      <span className="text-xs text-gray-400">
                                        {change.changes.length}处改动
                                      </span>
                                    </div>
                                    
                                    <div className="mb-2">
                                      <p className="mb-1 text-xs font-medium text-red-600">原文:</p>
                                      <p className="rounded bg-red-50 p-2 text-sm text-gray-700">
                                        {change.original}
                                      </p>
                                    </div>
                                    
                                    <div className="mb-2">
                                      <p className="mb-1 text-xs font-medium text-green-600">改写后:</p>
                                      <p className="rounded bg-green-50 p-2 text-sm text-gray-700">
                                        {change.rewritten}
                                      </p>
                                    </div>
                                    
                                    {change.changes.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <span className="font-medium">改动:</span> {change.changes.join('、')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            
                            {/* 完整改写预览 */}
                            <div>
                              <p className="mb-2 text-sm font-medium text-gray-700">完整改写预览:</p>
                              <ScrollArea className="max-h-40 rounded-lg border bg-white p-3">
                                <div className="prose prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {humanizeResult.rewrittenContent}
                                  </ReactMarkdown>
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        )}
                        
                        {/* 降低AI率按钮 */}
                        {detectResult.aiRate > 30 && !showHumanizeCompare && (
                          <Button
                            onClick={handleHumanize}
                            disabled={isHumanizing}
                            className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                            size="lg"
                          >
                            {isHumanizing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                正在改写文章...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                一键降低AI率
                              </>
                            )}
                          </Button>
                        )}
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Shield className="h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm text-gray-500">
                          点击左侧「AI检测」按钮<br/>开始检测文章AI特征
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="flex h-96 items-center justify-center text-center text-gray-400">
                <div>
                  <PenTool className="mx-auto mb-4 h-16 w-16 opacity-20" />
                  <p>在左侧输入标题，点击生成按钮</p>
                  <p className="mt-2 text-sm">AI 将为您创作一篇爆款文章</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SmartWritingPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">加载中...</div>}>
      <SmartWritingContent />
    </Suspense>
  );
}
