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
  RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

// 模拟提示词数据
const mockPrompts = [
  {
    id: 1,
    name: '情感类爆款文案',
    category: '情感',
    description: '擅长写触动人心的情感类文章',
  },
  {
    id: 2,
    name: '职场成长导师',
    category: '职场',
    description: '职场经验分享，帮助职场人成长',
  },
  {
    id: 3,
    name: '星座运势分析师',
    category: '星座',
    description: '专业的星座分析和运势预测',
  },
  {
    id: 4,
    name: '我的个人风格',
    category: '自定义',
    description: '自定义的写作风格',
  },
];

function SmartWritingContent() {
  const searchParams = useSearchParams();
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true); // 默认启用联网搜索
  const streamRef = useRef(false);

  // 从URL参数中获取标题和提示词
  useEffect(() => {
    const titleParam = searchParams.get('title');
    const promptParam = searchParams.get('prompt');

    if (titleParam) {
      setTitle(decodeURIComponent(titleParam));
    }

    if (promptParam) {
      // 如果有提示词参数，设置为自定义提示词
      const customPrompt = mockPrompts.find((p) => p.name === '我的个人风格');
      if (customPrompt) {
        setSelectedPrompt(customPrompt.id.toString());
      }
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!title.trim()) {
      alert('请输入文章标题');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    streamRef.current = true;

    try {
      const selectedPromptData = mockPrompts.find((p) => p.id === parseInt(selectedPrompt));

      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          prompt: selectedPromptData ? selectedPromptData.description : '',
          searchEnabled, // 传递联网搜索开关
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

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
                  setGeneratedContent((prev) => prev + parsed.content);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // 文章生成完成后，自动生成图片
        if (generatedContent) {
          await handleGenerateImage();
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
                  {mockPrompts.map((prompt) => (
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
                <li>• 文章会自动生成，字数控制在1200字左右</li>
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
                {/* 字数统计 */}
                <div className="mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    字数: {generatedContent.length}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    目标: 1200字
                  </Badge>
                  {imageUrls.length > 0 && (
                    <Badge variant="outline" className="text-sm">
                      插图: {imageUrls.length}张
                    </Badge>
                  )}
                </div>

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
