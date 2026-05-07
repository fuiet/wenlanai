'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  LayoutTemplate,
  Eye,
  Save,
  Download,
  Copy,
  Check,
  Palette,
  Type,
  Maximize,
  Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRequireLogin } from '@/hooks/useRequireLogin';

// 预设主题
const themes = [
  { id: 'modern', name: '现代简约', bg: '#ffffff', accent: '#3b82f6' },
  { id: 'warm', name: '温暖柔和', bg: '#fff7ed', accent: '#f97316' },
  { id: 'elegant', name: '优雅经典', bg: '#faf5ff', accent: '#8b5cf6' },
  { id: 'business', name: '商务专业', bg: '#f8fafc', accent: '#0f172a' },
  { id: 'nature', name: '自然清新', bg: '#f0fdf4', accent: '#22c55e' },
  { id: 'ocean', name: '海洋蓝调', bg: '#eff6ff', accent: '#3b82f6' },
  { id: 'sunset', name: '日落黄昏', bg: '#fef2f2', accent: '#ef4444' },
  { id: 'gold', name: '金色尊贵', bg: '#fffbeb', accent: '#f59e0b' },
  { id: 'pink', name: '粉色浪漫', bg: '#fdf2f8', accent: '#ec4899' },
  { id: 'dark', name: '暗夜风格', bg: '#1f2937', accent: '#fbbf24' },
];

export default function FormatArticlePage() {
  const { checkLogin } = useRequireLogin();
  const [content, setContent] = useState(`# 为什么你总是遇不到对的人？

在快节奏的现代生活中，很多人都在寻找那个"对的人"。

## 真相一：太完美主义

我们总是给自己设定了太多标准，要求对方完美无缺。

> 真正的爱情不是寻找完美的人，而是学会用完美的眼光去欣赏不完美的人。

## 真相二：害怕受伤害

曾经受过伤的人，往往更难敞开心扉。

### 如何放下过去？

1. 接受过去，让它成为成长的养分
2. 相信每一次相遇都有意义
3. 保持开放的心态，拥抱新可能

## 真相三：缺乏自我认知

很多时候，我们不知道自己真正想要什么。

**了解自己，才能找到合适的人。**

---

愿每个人都能遇见那个对的人。
`);
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [fontSize, setFontSize] = useState([16]);
  const [lineHeight, setLineHeight] = useState([1.8]);
  const [copied, setCopied] = useState(false);

  const currentTheme = themes.find(t => t.id === selectedTheme) || themes[0];

  const getThemeStyles = () => {
    return {
      backgroundColor: currentTheme.bg,
      color: currentTheme.id === 'dark' ? '#f3f4f6' : '#1f2937',
    };
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'article.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    // TODO: 实现保存到公众号的功能
    alert('文章已保存到草稿箱');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-xl font-bold text-gray-900 flex items-center">
          <LayoutTemplate className="mr-3 h-8 w-8 text-orange-500" />
          一键排版
        </h1>
        <p className="text-xs text-gray-500">Markdown编辑，一键排版成可以直接发布到公众号的格式</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Panel - Editor */}
        <div className="space-y-6">
          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Markdown 编辑器</span>
                <Badge variant="outline">支持 GFM 语法</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="在此输入或粘贴 Markdown 内容..."
                className="min-h-[400px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Style Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-500" />
                样式设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Selection */}
              <div>
                <Label className="mb-3 block">主题样式</Label>
                <div className="grid grid-cols-5 gap-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`relative h-16 rounded-lg border-2 transition-all hover:scale-105 ${
                        selectedTheme === theme.id
                          ? 'border-orange-500 ring-2 ring-orange-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: theme.bg }}
                      title={theme.name}
                    >
                      <div
                        className="absolute bottom-1 left-1 h-3 w-3 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    字体大小
                  </Label>
                  <span className="text-sm text-gray-600">{fontSize[0]}px</span>
                </div>
                <Slider
                  value={fontSize}
                  onValueChange={setFontSize}
                  min={12}
                  max={24}
                  step={1}
                />
              </div>

              {/* Line Height */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Maximize className="h-4 w-4" />
                    行间距
                  </Label>
                  <span className="text-sm text-gray-600">{lineHeight[0]}</span>
                </div>
                <Slider
                  value={lineHeight}
                  onValueChange={setLineHeight}
                  min={1.2}
                  max={2.5}
                  step={0.1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => {
              if (!checkLogin('copy')) return;
              handleCopy();
            }} variant="outline" className="flex-1">
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
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              下载
            </Button>
            <Button
              onClick={() => {
                if (!checkLogin('save')) return;
                handleSave();
              }}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <Save className="mr-2 h-4 w-4" />
              保存草稿
            </Button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                预览
              </div>
              <Badge className="bg-blue-100 text-blue-700">
                {currentTheme.name}
              </Badge>
            </CardTitle>
            <CardDescription>
              实时预览排版效果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg p-6 shadow-inner"
              style={getThemeStyles()}
            >
              <div
                style={{
                  fontSize: `${fontSize[0]}px`,
                  lineHeight: lineHeight[0],
                }}
                className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-strong:font-semibold prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-500"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card className="mt-6 bg-gradient-to-br from-green-50 to-blue-50 border-2">
        <CardContent className="py-6">
          <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            排版技巧
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 使用二级标题（##）分隔主要段落</li>
            <li>• 使用三级标题（###）创建子章节</li>
            <li>• 使用引用（&gt;）突出重点内容</li>
            <li>• 使用列表（1. 或 -）组织信息</li>
            <li>• 选择合适的主题，提升阅读体验</li>
            <li>• 调整字体大小和行间距，优化可读性</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
