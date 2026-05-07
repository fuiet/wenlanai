'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Wand2,
  Loader2,
  Copy,
  Check,
  User,
  FileText,
  Layout,
  Edit3,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 分析结果类型定义
interface AnalysisResult {
  persona?: {
    定位: string;
    特点: string[];
  };
  writingStyle?: {
    语言特点: string;
    表达技巧: string[];
    句式特点: string;
  };
  structure?: {
    文章结构: string;
    开头方式: string;
    结尾方式: string;
    逻辑关系: string[];
  };
  format?: {
    分段方式: string;
    标题层级: string;
    重点呈现: string[];
  };
  prompt?: string;
}

function PromptCraftingContent() {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const streamRef = useRef(false);

  // 从URL参数中获取标题和内容
  useEffect(() => {
    const titleParam = searchParams.get('title');
    const contentParam = searchParams.get('content');

    if (titleParam) {
      setTitle(decodeURIComponent(titleParam));
    }

    if (contentParam) {
      setContent(decodeURIComponent(contentParam));
    }
  }, [searchParams]);

  const handleAnalyze = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请输入文章标题和内容');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult('');
    setGeneratedPrompt('');
    streamRef.current = true;

    try {
      const response = await fetch('/api/analyze-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('分析失败');
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
                  setAnalysisResult((prev) => prev + parsed.content);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // 分析完成后，提取提示词部分
        const promptMatch = analysisResult.match(/```json\n([\s\S]*?)\n```/);
        if (promptMatch) {
          try {
            const jsonResult = JSON.parse(promptMatch[1]);
            setGeneratedPrompt(jsonResult.prompt || '');
          } catch {
            // JSON解析失败，忽略
          }
        }
      }
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析文章失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
      streamRef.current = false;
    }
  };

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleReset = () => {
    setTitle('');
    setContent('');
    setAnalysisResult('');
    setGeneratedPrompt('');
    setActiveTab('input');
  };

  // 解析JSON结果
  const parseAnalysisResult = (): AnalysisResult | null => {
    try {
      const jsonMatch = analysisResult.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]) as AnalysisResult;
      }
    } catch {
      // 解析失败，返回null
    }
    return null;
  };

  const analysis = parseAnalysisResult();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-xl font-bold text-gray-900 flex items-center">
          <Sparkles className="mr-3 h-8 w-8 text-purple-500" />
          提示词打造
        </h1>
        <p className="text-gray-600">分析爆款文章，提炼人设、文笔、思路、排版，生成可复用的创作提示词</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input">
            <FileText className="mr-2 h-4 w-4" />
            输入文章
          </TabsTrigger>
          <TabsTrigger value="analysis" disabled={!analysisResult}>
            <Edit3 className="mr-2 h-4 w-4" />
            分析结果
          </TabsTrigger>
          <TabsTrigger value="prompt" disabled={!generatedPrompt}>
            <Wand2 className="mr-2 h-4 w-4" />
            提示词
          </TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                文章信息
              </CardTitle>
              <CardDescription>输入爆款文章的标题和内容，系统将自动分析并生成提示词</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">文章标题</label>
                <Input
                  placeholder="输入文章标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">文章内容</label>
                <textarea
                  placeholder="粘贴文章内容（建议完整内容，至少200字）"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[400px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !title.trim() || !content.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      正在分析...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      开始分析
                    </>
                  )}
                </Button>
                <Button onClick={handleReset} variant="outline" size="lg">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2">
            <CardContent className="py-6">
              <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500" />
                使用技巧
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 粘贴爆款文章的标题和内容，系统将自动分析</li>
                <li>• 分析完成后，可查看人设、文笔、思路、排版等详细分析</li>
                <li>• 生成的可直接用于AI创作的提示词</li>
                <li>• 支持一键复制分析结果和提示词</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-purple-500" />
                  分析结果
                </div>
                <Button
                  onClick={() => handleCopy(analysisResult, 'analysis')}
                  variant="outline"
                  size="sm"
                >
                  {copied === 'analysis' ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      复制全部
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <span className="ml-4 text-gray-600">正在分析文章，请稍候...</span>
                </div>
              ) : analysis ? (
                <div className="space-y-6">
                  {/* 人设分析 */}
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-purple-600">
                      <User className="h-5 w-5" />
                      人设分析
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700">定位：</span>
                        <span className="text-gray-600">{analysis.persona?.定位}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">特点：</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {analysis.persona?.特点?.map((item, index) => (
                            <Badge key={index} variant="secondary">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 文笔分析 */}
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-600">
                      <Edit3 className="h-5 w-5" />
                      文笔分析
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700">语言特点：</span>
                        <span className="text-gray-600">{analysis.writingStyle?.语言特点}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">表达技巧：</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {analysis.writingStyle?.表达技巧?.map((item, index) => (
                            <Badge key={index} variant="secondary">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">句式特点：</span>
                        <span className="text-gray-600">{analysis.writingStyle?.句式特点}</span>
                      </div>
                    </div>
                  </div>

                  {/* 思路分析 */}
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-green-600">
                      <Layout className="h-5 w-5" />
                      思路分析
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700">文章结构：</span>
                        <span className="text-gray-600">{analysis.structure?.文章结构}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">开头方式：</span>
                        <span className="text-gray-600">{analysis.structure?.开头方式}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">结尾方式：</span>
                        <span className="text-gray-600">{analysis.structure?.结尾方式}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">逻辑关系：</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {analysis.structure?.逻辑关系?.map((item, index) => (
                            <Badge key={index} variant="secondary">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 排版分析 */}
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-orange-600">
                      <FileText className="h-5 w-5" />
                      排版分析
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700">分段方式：</span>
                        <span className="text-gray-600">{analysis.format?.分段方式}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">标题层级：</span>
                        <span className="text-gray-600">{analysis.format?.标题层级}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">重点呈现：</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {analysis.format?.重点呈现?.map((item, index) => (
                            <Badge key={index} variant="secondary">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {analysisResult}
                  </ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompt Tab */}
        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-500" />
                  生成提示词
                </div>
                <Button
                  onClick={() => handleCopy(generatedPrompt, 'prompt')}
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {copied === 'prompt' ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      复制提示词
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                可直接用于AI创作的提示词，复制后可在智能生文页面使用
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <span className="ml-4 text-gray-600">正在生成提示词...</span>
                </div>
              ) : generatedPrompt ? (
                <div className="rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 p-6">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{generatedPrompt}</pre>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-center text-gray-400">
                  <div>
                    <Wand2 className="mx-auto mb-4 h-16 w-16 opacity-20" />
                    <p>暂无提示词</p>
                    <p className="mt-2 text-sm">请先在&quot;输入文章&quot;中分析文章</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 快速使用 */}
          {generatedPrompt && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  快速使用
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  点击下方按钮，将提示词带到智能生文页面，快速创作同类型文章
                </p>
                <Button
                  onClick={() => {
                    const encodedPrompt = encodeURIComponent(generatedPrompt);
                    window.location.href = `/smart-writing?prompt=${encodedPrompt}`;
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  size="lg"
                >
                  <Wand2 className="mr-2 h-5 w-5" />
                  前往智能生文
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PromptCraftingPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">加载中...</div>}>
      <PromptCraftingContent />
    </Suspense>
  );
}
