'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  LayoutTemplate,
  Save,
  Copy,
  Check,
  Palette,
  Type,
  Maximize,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Settings,
  Shuffle,
  Image as ImageIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 预设主题样式
const themes = [
  { id: 'modern', name: '现代简约', bg: '#ffffff', accent: '#3b82f6', textColor: '#1f2937' },
  { id: 'warm', name: '温暖柔和', bg: '#fff7ed', accent: '#f97316', textColor: '#1f2937' },
  { id: 'elegant', name: '优雅经典', bg: '#faf5ff', accent: '#8b5cf6', textColor: '#1f2937' },
  { id: 'business', name: '商务专业', bg: '#f8fafc', accent: '#0f172a', textColor: '#1f2937' },
  { id: 'nature', name: '自然清新', bg: '#f0fdf4', accent: '#22c55e', textColor: '#1f2937' },
  { id: 'ocean', name: '海洋蓝调', bg: '#eff6ff', accent: '#3b82f6', textColor: '#1f2937' },
  { id: 'sunset', name: '日落黄昏', bg: '#fef2f2', accent: '#ef4444', textColor: '#1f2937' },
  { id: 'gold', name: '金色尊贵', bg: '#fffbeb', accent: '#f59e0b', textColor: '#1f2937' },
  { id: 'pink', name: '粉色浪漫', bg: '#fdf2f8', accent: '#ec4899', textColor: '#1f2937' },
  { id: 'dark', name: '暗夜风格', bg: '#1f2937', accent: '#fbbf24', textColor: '#f3f4f6' },
  { id: 'teal', name: '青绿导读', bg: '#f0fdfa', accent: '#059669', textColor: '#1f2937' },
  { id: 'indigo', name: '靛蓝文风', bg: '#eef2ff', accent: '#6366f1', textColor: '#1f2937' },
  { id: 'rose', name: '玫瑰物语', bg: '#fff1f2', accent: '#f43f5e', textColor: '#1f2937' },
  { id: 'amber', name: '琥珀时光', bg: '#fffbeb', accent: '#d97706', textColor: '#1f2937' },
];

// 字体选项
const fontOptions = [
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimSun', label: '宋体' },
  { value: 'SimHei', label: '黑体' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'Arial', label: 'Arial' },
];

export default function FormatArticlePage() {
  const [title, setTitle] = useState('点击这里设置标题');
  const [content, setContent] = useState(`在这里编辑文章内容...

## 第一部分标题

这是文章的正文内容，可以输入任意文字。使用 Markdown 语法来格式化文本。

### 子标题

- 列表项一
- 列表项二
- 列表项三

> 引用内容：这里是重点引用，可以突出显示重要信息。

## 第二部分标题

继续编辑你的文章内容，支持多种格式。

**加粗文本** 和 *斜体文本*

1. 有序列表第一项
2. 有序列表第二项
3. 有序列表第三项
`);
  
  const [selectedTheme, setSelectedTheme] = useState('teal');
  const [selectedColor, setSelectedColor] = useState('#059669');
  const [fontFamily, setFontFamily] = useState('Microsoft YaHei');
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.75);
  const [paragraphSpacing, setParagraphSpacing] = useState(24);
  const [sidePadding, setSidePadding] = useState(16);
  const [imageRounded, setImageRounded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const currentTheme = themes.find(t => t.id === selectedTheme) || themes[0];

  // 计算字数
  const wordCount = content.replace(/[#*`>\-\[\]()]/g, '').length;

  // 随机切换主题
  const handleRandomTheme = () => {
    const randomIndex = Math.floor(Math.random() * themes.length);
    const randomTheme = themes[randomIndex];
    setSelectedTheme(randomTheme.id);
    setSelectedColor(randomTheme.accent);
  };

  // 复制内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 保存草稿
  const handleSave = () => {
    alert('文章已存入草稿箱');
  };

  // 预览样式
  const previewStyles = {
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight,
    padding: `${paragraphSpacing}px ${sidePadding}px`,
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部全局操作栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <LayoutTemplate className="h-5 w-5 text-orange-500 mr-2" />
            <h1 className="text-lg font-bold text-gray-900">一键排版</h1>
          </div>
          
          {/* 标题设置 */}
          <div className="flex items-center gap-2 ml-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="点击这里设置标题"
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <Button variant="outline" size="sm" className="text-orange-500 border-orange-300 hover:bg-orange-50">
              <ImageIcon className="h-4 w-4 mr-1" />
              设置封面
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSave}
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            存入草稿箱
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500">
            <span className="text-lg">?</span>
          </Button>
          <Button 
            onClick={handleCopy}
            variant="outline" 
            size="sm"
            className="bg-purple-500 hover:bg-purple-600 text-white border-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                复制
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 主内容区 - 三栏布局 */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 左侧排版设置区域 */}
        {showLeftPanel && (
          <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  排版设置
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowLeftPanel(false)}
                  className="text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                >
                  隐藏
                </Button>
              </div>

              {/* 主题样式 */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">主题样式</Label>
                </div>
                <select
                  value={selectedTheme}
                  onChange={(e) => {
                    setSelectedTheme(e.target.value);
                    const theme = themes.find(t => t.id === e.target.value);
                    if (theme) setSelectedColor(theme.accent);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {themes.map(theme => (
                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                  ))}
                </select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2 text-purple-500 border-purple-300 hover:bg-purple-50"
                  onClick={handleRandomTheme}
                >
                  <Shuffle className="h-4 w-4 mr-1" />
                  随机样式
                </Button>
              </div>

              {/* 主题色 */}
              <div className="mb-5">
                <Label className="text-sm font-medium mb-2 block">主题色</Label>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {[
                    '#059669', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
                    '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1',
                    '#a855f7', '#f472b6', '#ef4444', '#fb923c'
                  ].map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-md transition-all ${
                        selectedColor === color 
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-center"
                  placeholder="#000000"
                />
              </div>

              {/* 字体设置 */}
              <div className="mb-5">
                <Label className="text-sm font-medium mb-2 block">字体设置</Label>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">文字字体</Label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                    >
                      {fontOptions.map(font => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Type className="h-3 w-3" />
                        字体大小
                      </Label>
                      <span className="text-xs text-gray-400">{fontSize}px</span>
                    </div>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                    >
                      {[12, 14, 15, 16, 17, 18, 20, 22, 24].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Maximize className="h-3 w-3" />
                        行间距
                      </Label>
                      <span className="text-xs text-gray-400">{lineHeight}</span>
                    </div>
                    <select
                      value={lineHeight}
                      onChange={(e) => setLineHeight(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                    >
                      {[1.5, 1.6, 1.75, 1.8, 2.0, 2.2].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-gray-500">段间距</Label>
                      <span className="text-xs text-gray-400">{paragraphSpacing}px</span>
                    </div>
                    <select
                      value={paragraphSpacing}
                      onChange={(e) => setParagraphSpacing(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                    >
                      {[8, 12, 16, 20, 24, 28, 32].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-gray-500">左右边距</Label>
                      <span className="text-xs text-gray-400">{sidePadding}px</span>
                    </div>
                    <select
                      value={sidePadding}
                      onChange={(e) => setSidePadding(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                    >
                      {[8, 12, 16, 20, 24, 28, 32].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 其他设置 */}
              <div className="mb-5">
                <Label className="text-sm font-medium mb-2 block">其他设置</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={imageRounded}
                      onChange={(e) => setImageRounded(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">图片添加圆角</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">朱雀检测</span>
                    <span className="text-xs text-gray-400">(效果非100%保证)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 切换左侧面板按钮 */}
        {!showLeftPanel && (
          <button
            onClick={() => setShowLeftPanel(true)}
            className="w-8 bg-white border-r border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* 中间Markdown编辑区域 */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Markdown编辑</span>
              <span className="text-xs text-gray-400">Ctrl+B 加粗 · Ctrl+I 斜体</span>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7 bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100">
              支持粘贴插入配图
            </Button>
          </div>
          
          <div className="flex-1 p-4 overflow-auto">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在这里编辑文章内容..."
              className="w-full h-full min-h-[500px] border-0 resize-none focus:ring-0 text-sm leading-relaxed p-0"
              style={{ fontFamily: fontFamily, fontSize: `${fontSize}px`, lineHeight: lineHeight }}
            />
          </div>

          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50">
            <span>内容会自动保存 · 字数: {wordCount}</span>
            <span>今日已上传: 0/0</span>
          </div>
        </div>

        {/* 切换右侧面板按钮 */}
        {!showRightPanel && (
          <button
            onClick={() => setShowRightPanel(true)}
            className="w-8 bg-white border-l border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* 右侧公众号预览区域 */}
        {showRightPanel && (
          <div className="w-80 bg-gray-100 border-l border-gray-200 overflow-y-auto shrink-0 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                公众号预览
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowRightPanel(false)}
                className="text-purple-500 hover:text-purple-600 hover:bg-purple-50 text-xs h-7"
              >
                隐藏
              </Button>
            </div>

            {/* 手机模拟器 */}
            <div className="bg-gray-800 rounded-[40px] p-2 shadow-xl">
              <div className="bg-white rounded-[32px] overflow-hidden">
                {/* 手机状态栏 */}
                <div className="bg-gray-900 px-4 py-2 flex items-center justify-between text-white text-xs">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-2 border border-white rounded-sm relative">
                      <div className="absolute inset-0.5 right-1 bg-white rounded-sm" />
                    </div>
                    <div className="w-4 h-2 border border-white rounded-sm" />
                    <div className="w-4 h-2 border border-white rounded-sm" />
                  </div>
                </div>

                {/* 公众号内容 */}
                <div 
                  className="h-[580px] overflow-y-auto bg-white"
                  style={{
                    fontFamily: fontFamily,
                    fontSize: `${fontSize}px`,
                    lineHeight: lineHeight,
                  }}
                >
                  {/* 文章头部 */}
                  <div className="p-4">
                    <h1 
                      className="text-lg font-bold mb-3 leading-tight"
                      style={{ color: selectedColor }}
                    >
                      {title}
                    </h1>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge 
                        className="text-xs px-2 py-0.5"
                        style={{ backgroundColor: selectedColor, color: '#fff' }}
                      >
                        原创
                      </Badge>
                      <span className="text-xs text-gray-500">文澜智作</span>
                    </div>
                  </div>

                  {/* 文章内容 */}
                  <div 
                    className="px-4 pb-6"
                    style={{ paddingLeft: `${sidePadding}px`, paddingRight: `${sidePadding}px` }}
                  >
                    <div 
                      className="prose max-w-none"
                      style={{
                        '--tw-prose-body': currentTheme.textColor,
                        '--tw-prose-headings': selectedColor,
                        '--tw-prose-links': selectedColor,
                        '--tw-prose-bold': currentTheme.textColor,
                        '--tw-prose-quotes': '#6b7280',
                        '--tw-prose-blockquote-border': selectedColor,
                      } as React.CSSProperties}
                    >
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="text-xl font-bold mb-3 mt-4" style={{ color: selectedColor }}>{children}</h1>,
                          h2: ({children}) => <h2 className="text-lg font-bold mb-3 mt-4" style={{ color: selectedColor }}>{children}</h2>,
                          h3: ({children}) => <h3 className="text-base font-semibold mb-2 mt-3" style={{ color: currentTheme.textColor }}>{children}</h3>,
                          p: ({children}) => <p className="mb-3" style={{ lineHeight: lineHeight, marginBottom: `${paragraphSpacing}px` }}>{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-sm" style={{ lineHeight: lineHeight }}>{children}</li>,
                          blockquote: ({children}) => (
                            <blockquote 
                              className="border-l-4 pl-3 my-3 italic text-sm"
                              style={{ 
                                borderColor: selectedColor,
                                color: '#6b7280'
                              }}
                            >
                              {children}
                            </blockquote>
                          ),
                          strong: ({children}) => <strong className="font-semibold" style={{ color: currentTheme.textColor }}>{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          hr: () => <hr className="my-4 border-gray-200" />,
                          img: ({src, alt}) => (
                            <img 
                              src={src} 
                              alt={alt} 
                              className={`w-full my-3 ${imageRounded ? 'rounded-lg' : ''}`}
                              style={{ 
                                borderRadius: imageRounded ? '12px' : '0'
                              }}
                            />
                          ),
                          a: ({href, children}) => (
                            <a href={href} className="underline" style={{ color: selectedColor }}>{children}</a>
                          ),
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* 底部工具栏 */}
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                        文
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">文澜智作</div>
                        <div className="text-xs text-gray-500">让创作更简单</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-around mt-3 pt-3 border-t border-gray-100">
                      <button className="flex flex-col items-center gap-0.5 text-gray-500">
                        <span className="text-lg">&#9829;</span>
                        <span className="text-xs">赞</span>
                      </button>
                      <button className="flex flex-col items-center gap-0.5 text-gray-500">
                        <span className="text-lg">&#8634;</span>
                        <span className="text-xs">分享</span>
                      </button>
                      <button className="flex flex-col items-center gap-0.5 text-gray-500">
                        <span className="text-lg">&#9733;</span>
                        <span className="text-xs">收藏</span>
                      </button>
                      <button className="flex flex-col items-center gap-0.5 text-gray-500">
                        <span className="text-lg">&#9998;</span>
                        <span className="text-xs">评论</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
