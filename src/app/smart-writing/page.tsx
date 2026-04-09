'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Image as ImageIcon
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
  const [copied, setCopied] = useState(false);
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

  const handleGenerateImage = async () => {
    // TODO: 实现根据文章内容生成插图的功能
    alert('插图生成功能开发中...');
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
            <CardContent>
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
                正在生成...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-5 w-5" />
                开始生成文章
              </>
            )}
          </Button>

          {/* Action Buttons */}
          {generatedContent && (
            <div className="flex gap-2">
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
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                生成插图
              </Button>
              <Button
                onClick={handleSaveDraft}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Save className="mr-2 h-4 w-4" />
                保存草稿
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
                <li>• 选择合适的提示词人设，让文章更符合目标读者</li>
                <li>• 标题要吸引人，包含关键词或引发好奇</li>
                <li>• 生成后可以根据需要修改和优化内容</li>
                <li>• 点击&ldquo;生成插图&rdquo;可以为文章配图</li>
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
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {generatedContent}
                </ReactMarkdown>
              </div>
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
