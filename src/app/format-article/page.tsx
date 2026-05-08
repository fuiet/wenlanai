'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutTemplate,
  Save,
  Copy,
  Check,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlignLeft,
  AlignCenter,
  Bold,
  Quote,
  Highlighter,
  Bookmark,
  RotateCcw,
  Upload,
  Wand2,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 预设主题模板
const presetThemes = [
  { id: 'qinglv', name: '青绿', bg: '#f0fdfa', accent: '#059669', textColor: '#1f2937' },
  { id: 'nuanceng', name: '暖橙', bg: '#fff7ed', accent: '#f97316', textColor: '#1f2937' },
  { id: 'shenlan', name: '深蓝', bg: '#eff6ff', accent: '#3b82f6', textColor: '#1f2937' },
  { id: 'jijianbai', name: '极简白', bg: '#ffffff', accent: '#374151', textColor: '#1f2937' },
  { id: 'huanjiu', name: '护眼绿', bg: '#f0fdf4', accent: '#15803d', textColor: '#1f2937' },
  { id: 'danya', name: '淡雅紫', bg: '#faf5ff', accent: '#7c3aed', textColor: '#1f2937' },
  { id: 'yinshi', name: '复古灰', bg: '#f9fafb', accent: '#4b5563', textColor: '#374151' },
  { id: 'heian', name: '暗夜风', bg: '#1f2937', accent: '#fbbf24', textColor: '#f3f4f6' },
];

// 默认样式配置
const defaultStyles = {
  bgColor: '#ffffff',
  accentColor: '#059669',
  textColor: '#1f2937',
  fontFamily: 'Microsoft YaHei',
  titleFont: 'Microsoft YaHei',
  fontSize: 16,
  lineHeight: 1.75,
  paragraphSpacing: 16,
  sidePadding: 16,
  h1Size: 22,
  h1Color: '#059669',
  h1Bold: true,
  h1Align: 'left',
  h2Size: 18,
  h2Color: '#059669',
  h2Bold: true,
  h2Align: 'left',
  boldColor: '#1f2937',
  quoteBorderColor: '#059669',
  quoteBgColor: '#f0fdfa',
  quoteIcon: true,
  highlightColor: '#fef08a',
  imageRadius: 8,
  imageCaptionSize: 12,
  imageCaptionColor: '#6b7280',
  imageCaptionAlign: 'center',
  imageSpacing: 16,
  firstLineIndent: false,
  dividerStyle: 'solid',
};

// 字体选项
const fontOptions = [
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimSun', label: '宋体' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'SimHei', label: '黑体' },
  { value: 'PingFang SC', label: '苹方' },
  { value: 'Source Han Sans CN', label: '思源黑体' },
];

// 分割线样式
const dividerStyles = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
];

function FormatArticleContent() {
  const searchParams = useSearchParams();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
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

---

愿每个人都能遇见那个对的人。
`);
  
  // 样式状态
  const [styles, setStyles] = useState(defaultStyles);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('theme');
  const [copied, setCopied] = useState(false);
  
  // 折叠状态
  const [collapsedSections, setCollapsedSections] = useState<{[key: string]: boolean}>({
    theme: false,
    font: true,
    heading: true,
    emphasis: true,
    image: true,
    other: true,
    template: true,
  });

  // 用户模板
  const [userTemplates, setUserTemplates] = useState<{id: string; name: string; styles: typeof defaultStyles}[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);

  // 从 URL 参数读取文章数据
  useEffect(() => {
    const articleParam = searchParams.get('article');
    if (articleParam) {
      try {
        const article = JSON.parse(decodeURIComponent(articleParam));
        if (article.title) setTitle(article.title);
        if (article.content) {
          // 直接使用传入的内容（已包含图片在正确位置）
          setContent(article.content);
        }
      } catch (e) {
        console.error('解析文章数据失败:', e);
      }
    }
  }, [searchParams]);

  // 从localStorage加载用户模板
  useEffect(() => {
    const saved = localStorage.getItem('formatTemplates');
    if (saved) {
      try {
        setUserTemplates(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // 计算字数
  const wordCount = content.replace(/[#*`>\-\[\]()]/g, '').length;

  // 更新样式
  const updateStyle = (key: string, value: any) => {
    setStyles(prev => ({ ...prev, [key]: value }));
  };

  // 切换折叠
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 随机主题
  const handleRandomTheme = () => {
    const random = presetThemes[Math.floor(Math.random() * presetThemes.length)];
    setStyles(prev => ({
      ...prev,
      bgColor: random.bg,
      accentColor: random.accent,
      textColor: random.textColor,
    }));
  };

  // 应用主题模板
  const applyTheme = (theme: typeof presetThemes[0]) => {
    setStyles(prev => ({
      ...prev,
      bgColor: theme.bg,
      accentColor: theme.accent,
      textColor: theme.textColor,
    }));
  };

  // 保存模板
  const saveTemplate = () => {
    if (!templateName.trim()) {
      alert('请输入模板名称');
      return;
    }
    const newTemplate = {
      id: Date.now().toString(),
      name: templateName,
      styles: { ...styles },
    };
    const updated = [...userTemplates, newTemplate];
    setUserTemplates(updated);
    localStorage.setItem('formatTemplates', JSON.stringify(updated));
    setTemplateName('');
    setShowTemplateInput(false);
    alert('模板保存成功');
  };

  // 应用模板
  const applyTemplate = (template: typeof userTemplates[0]) => {
    setStyles(template.styles);
  };

  // 删除模板
  const deleteTemplate = (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;
    const updated = userTemplates.filter(t => t.id !== id);
    setUserTemplates(updated);
    localStorage.setItem('formatTemplates', JSON.stringify(updated));
  };

  // 恢复默认
  const resetToDefault = () => {
    if (!confirm('确定要恢复系统默认设置吗？')) return;
    setStyles(defaultStyles);
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

  // 一键排版
  const handleAutoFormat = () => {
    // 自动美化文章格式
    let formatted = content;
    // 确保标题格式正确
    formatted = formatted.replace(/^#\s+(.+)$/gm, '## $1');
    // 确保引用格式正确
    formatted = formatted.replace(/^>\s*(.+)$/gm, '> $1');
    // 确保列表格式正确
    formatted = formatted.replace(/^-\s+(.+)$/gm, '- $1');
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '1. $1');
    setContent(formatted);
    alert('排版已完成');
  };

  // 编辑区滚动同步到预览区
  const handleEditorScroll = useCallback(() => {
    if (editorRef.current && previewRef.current) {
      const editorScrollRatio = editorRef.current.scrollTop / (editorRef.current.scrollHeight - editorRef.current.clientHeight);
      const previewMaxScroll = previewRef.current.scrollHeight - previewRef.current.clientHeight;
      previewRef.current.scrollTop = editorScrollRatio * previewMaxScroll;
    }
  }, []);

  // 预览区滚动同步到编辑区
  const handlePreviewScroll = useCallback(() => {
    if (editorRef.current && previewRef.current) {
      const previewScrollRatio = previewRef.current.scrollTop / (previewRef.current.scrollHeight - previewRef.current.clientHeight);
      const editorMaxScroll = editorRef.current.scrollHeight - editorRef.current.clientHeight;
      editorRef.current.scrollTop = previewScrollRatio * editorMaxScroll;
    }
  }, []);

  // 渲染样式
  const previewStyles = {
    fontFamily: styles.fontFamily,
    fontSize: `${styles.fontSize}px`,
    lineHeight: styles.lineHeight,
    padding: `${styles.paragraphSpacing}px ${styles.sidePadding}px`,
    backgroundColor: styles.bgColor,
    color: styles.textColor,
    textAlign: styles.firstLineIndent ? 'justify' : 'left',
  };

  // 获取分割线样式
  const getDividerStyle = () => {
    switch (styles.dividerStyle) {
      case 'dashed': return 'border-dashed border-t-2 border-gray-300 my-6';
      case 'dotted': return 'border-t-2 border-dotted border-gray-300 my-6';
      default: return 'border-t border-gray-200 my-6';
    }
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
            onClick={handleAutoFormat}
            variant="outline" 
            size="sm"
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Wand2 className="h-4 w-4 mr-1" />
            一键排版
          </Button>
          <Button 
            onClick={handleSave}
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            存入草稿箱
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
        
        {/* 左侧排版设置面板 */}
        {leftPanelOpen && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shrink-0 flex flex-col">
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  排版设置
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLeftPanelOpen(false)}
                  className="text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                >
                  隐藏
                </Button>
              </div>

              {/* 基础样式 */}
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer py-2"
                  onClick={() => toggleSection('theme')}
                >
                  <span className="text-sm font-medium text-gray-800">基础样式</span>
                  {collapsedSections.theme ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
                {!collapsedSections.theme && (
                  <div className="space-y-3 pl-0 pt-2">
                    {/* 主题模板 */}
                    <div>
                      <Label className="text-xs text-gray-500 mb-2 block">主题模板</Label>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {presetThemes.map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => applyTheme(theme)}
                            className="h-8 rounded-md border border-gray-200 text-xs font-medium flex items-center justify-center transition-all hover:scale-105"
                            style={{ 
                              backgroundColor: theme.bg,
                              color: theme.accent,
                              borderColor: styles.accentColor === theme.accent ? theme.accent : undefined,
                            }}
                            title={theme.name}
                          >
                            {theme.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs h-7"
                          onClick={handleRandomTheme}
                        >
                          <Shuffle className="h-3 w-3 mr-1" />
                          随机样式
                        </Button>
                      </div>
                    </div>

                    {/* 主题色 */}
                    <div>
                      <Label className="text-xs text-gray-500 mb-2 block">主题色</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={styles.accentColor}
                          onChange={(e) => updateStyle('accentColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={styles.accentColor}
                          onChange={(e) => updateStyle('accentColor', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                        />
                      </div>
                    </div>

                    {/* 背景色 */}
                    <div>
                      <Label className="text-xs text-gray-500 mb-2 block">背景色</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={styles.bgColor}
                          onChange={(e) => updateStyle('bgColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <select
                          value={styles.bgColor}
                          onChange={(e) => updateStyle('bgColor', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                        >
                          <option value="#ffffff">白色</option>
                          <option value="#fff7ed">浅米色</option>
                          <option value="#f9fafb">浅灰色</option>
                          <option value="#f0fdf4">护眼绿</option>
                          <option value="#eff6ff">浅蓝色</option>
                          <option value="#faf5ff">浅紫色</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 字体排版 */}
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer py-2 border-t border-gray-100"
                  onClick={() => toggleSection('font')}
                >
                  <span className="text-sm font-medium text-gray-800">字体排版</span>
                  {collapsedSections.font ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
                {!collapsedSections.font && (
                  <div className="space-y-3 pl-0 pt-2">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">正文字体</Label>
                      <select
                        value={styles.fontFamily}
                        onChange={(e) => updateStyle('fontFamily', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                      >
                        {fontOptions.map(font => (
                          <option key={font.value} value={font.value}>{font.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">字体大小</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="12"
                          max="20"
                          value={styles.fontSize}
                          onChange={(e) => updateStyle('fontSize', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 w-10 text-right">{styles.fontSize}px</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">字体颜色</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={styles.textColor}
                          onChange={(e) => updateStyle('textColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={styles.textColor}
                          onChange={(e) => updateStyle('textColor', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">行间距</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1.2"
                          max="2.5"
                          step="0.1"
                          value={styles.lineHeight}
                          onChange={(e) => updateStyle('lineHeight', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 w-10 text-right">{styles.lineHeight}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">段间距</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="8"
                          max="48"
                          value={styles.paragraphSpacing}
                          onChange={(e) => updateStyle('paragraphSpacing', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 w-10 text-right">{styles.paragraphSpacing}px</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">左右边距</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="8"
                          max="48"
                          value={styles.sidePadding}
                          onChange={(e) => updateStyle('sidePadding', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 w-10 text-right">{styles.sidePadding}px</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 标题样式 */}
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer py-2 border-t border-gray-100"
                  onClick={() => toggleSection('heading')}
                >
                  <span className="text-sm font-medium text-gray-800">标题样式</span>
                  {collapsedSections.heading ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
                {!collapsedSections.heading && (
                  <div className="space-y-3 pl-0 pt-2">
                    {/* 一级标题 */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">一级标题</Label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateStyle('h1Bold', !styles.h1Bold)}
                            className={`p-1 rounded ${styles.h1Bold ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'}`}
                          >
                            <Bold className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => updateStyle('h1Align', styles.h1Align === 'left' ? 'center' : 'left')}
                            className="p-1 rounded bg-gray-200 text-gray-600"
                          >
                            {styles.h1Align === 'left' ? <AlignLeft className="h-3 w-3" /> : <AlignCenter className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-400">字号</Label>
                          <select
                            value={styles.h1Size}
                            onChange={(e) => updateStyle('h1Size', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                          >
                            {[18, 20, 22, 24, 26, 28].map(s => (
                              <option key={s} value={s}>{s}px</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">颜色</Label>
                          <input
                            type="color"
                            value={styles.h1Color}
                            onChange={(e) => updateStyle('h1Color', e.target.value)}
                            className="w-full h-7 rounded cursor-pointer border border-gray-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 二级标题 */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">二级标题</Label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateStyle('h2Bold', !styles.h2Bold)}
                            className={`p-1 rounded ${styles.h2Bold ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'}`}
                          >
                            <Bold className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => updateStyle('h2Align', styles.h2Align === 'left' ? 'center' : 'left')}
                            className="p-1 rounded bg-gray-200 text-gray-600"
                          >
                            {styles.h2Align === 'left' ? <AlignLeft className="h-3 w-3" /> : <AlignCenter className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-400">字号</Label>
                          <select
                            value={styles.h2Size}
                            onChange={(e) => updateStyle('h2Size', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                          >
                            {[14, 16, 18, 20, 22, 24].map(s => (
                              <option key={s} value={s}>{s}px</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">颜色</Label>
                          <input
                            type="color"
                            value={styles.h2Color}
                            onChange={(e) => updateStyle('h2Color', e.target.value)}
                            className="w-full h-7 rounded cursor-pointer border border-gray-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 强调与引用 */}
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer py-2 border-t border-gray-100"
                  onClick={() => toggleSection('emphasis')}
                >
                  <span className="text-sm font-medium text-gray-800">强调与引用</span>
                  {collapsedSections.emphasis ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
                {!collapsedSections.emphasis && (
                  <div className="space-y-3 pl-0 pt-2">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">加粗文字颜色</Label>
                      <input
                        type="color"
                        value={styles.boldColor}
                        onChange={(e) => updateStyle('boldColor', e.target.value)}
                        className="w-full h-8 rounded cursor-pointer border border-gray-200"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">引用块左边框</Label>
                      <input
                        type="color"
                        value={styles.quoteBorderColor}
                        onChange={(e) => updateStyle('quoteBorderColor', e.target.value)}
                        className="w-full h-8 rounded cursor-pointer border border-gray-200 mb-2"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={styles.quoteIcon}
                          onChange={(e) => updateStyle('quoteIcon', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-600">显示引号图标</span>
                      </label>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">重点标注高亮色</Label>
                      <div className="flex gap-2">
                        {['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#f5d0fe'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateStyle('highlightColor', color)}
                            className={`w-8 h-8 rounded-lg border-2 ${styles.highlightColor === color ? 'border-gray-800' : 'border-gray-200'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 图片样式 */}
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer py-2 border-t border-gray-100"
                  onClick={() => toggleSection('image')}
                >
                  <span className="text-sm font-medium text-gray-800">图片样式</span>
                  {collapsedSections.image ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
                {!collapsedSections.image && (
                  <div className="space-y-3 pl-0 pt-2">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">图片圆角</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={styles.imageRadius}
                          onChange={(e) => updateStyle('imageRadius', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 w-10 text-right">{styles.imageRadius}px</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">图片间距</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="8"
                          max="32"
                          value={styles.imageSpacing}
                          onChange={(e) => updateStyle('imageSpacing', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 w-10 text-right">{styles.imageSpacing}px</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 其他设置 */}
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer py-2 border-t border-gray-100"
                  onClick={() => toggleSection('other')}
                >
                  <span className="text-sm font-medium text-gray-800">其他设置</span>
                  {collapsedSections.other ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
                {!collapsedSections.other && (
                  <div className="space-y-3 pl-0 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={styles.firstLineIndent}
                        onChange={(e) => updateStyle('firstLineIndent', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600">段落首行缩进</span>
                    </label>

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">分割线样式</Label>
                      <div className="flex gap-2">
                        {dividerStyles.map(style => (
                          <button
                            key={style.value}
                            onClick={() => updateStyle('dividerStyle', style.value)}
                            className={`flex-1 py-1.5 text-xs rounded border ${
                              styles.dividerStyle === style.value 
                                ? 'border-purple-500 bg-purple-50 text-purple-600' 
                                : 'border-gray-200 text-gray-600'
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 我的模板 */}
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer py-2 border-t border-gray-100"
                  onClick={() => toggleSection('template')}
                >
                  <span className="text-sm font-medium text-gray-800">我的模板</span>
                  {collapsedSections.template ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
                {!collapsedSections.template && (
                  <div className="space-y-3 pl-0 pt-2">
                    {showTemplateInput ? (
                      <div className="space-y-2">
                        <Input
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="输入模板名称"
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-purple-500" onClick={saveTemplate}>
                            保存
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowTemplateInput(false)}>
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
                        onClick={() => setShowTemplateInput(true)}
                      >
                        <Bookmark className="h-4 w-4 mr-1" />
                        保存当前样式为模板
                      </Button>
                    )}

                    {userTemplates.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {userTemplates.map(template => (
                          <div key={template.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <span className="flex-1 text-xs truncate">{template.name}</span>
                            <button
                              onClick={() => applyTemplate(template)}
                              className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded hover:bg-purple-200"
                            >
                              应用
                            </button>
                            <button
                              onClick={() => deleteTemplate(template.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-gray-500 border-gray-300 hover:bg-gray-50 mt-2"
                      onClick={resetToDefault}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      恢复系统默认
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 切换左侧面板按钮 */}
        {!leftPanelOpen && (
          <button
            onClick={() => setLeftPanelOpen(true)}
            className="w-8 bg-white border-r border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* 中间Markdown编辑区域 */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Markdown编辑</span>
              <span className="text-xs text-gray-400">Ctrl+B 加粗 · Ctrl+I 斜体</span>
            </div>
            <span className="text-xs text-gray-400">支持粘贴插入配图</span>
          </div>
          
          <div className="flex-1 p-4 overflow-hidden">
            <Textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onScroll={handleEditorScroll}
              placeholder="在这里编辑文章内容..."
              className="w-full h-full border-0 resize-none focus:ring-0 text-sm leading-relaxed p-0"
              style={{ fontFamily: styles.fontFamily, fontSize: `${styles.fontSize}px`, lineHeight: styles.lineHeight }}
            />
          </div>

          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50">
            <span>内容会自动保存 · 字数: {wordCount}</span>
            <span>今日已上传: 0/0</span>
          </div>
        </div>

        {/* 切换右侧面板按钮 */}
        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="w-8 bg-white border-l border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* 右侧公众号预览区域 */}
        {rightPanelOpen && (
          <div className="w-96 bg-gray-100 border-l border-gray-200 overflow-hidden shrink-0 flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between shrink-0">
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                公众号预览
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setRightPanelOpen(false)}
                className="text-purple-500 hover:text-purple-600 hover:bg-purple-50 text-xs h-7"
              >
                隐藏
              </Button>
            </div>

            {/* 手机模拟器容器 */}
            <div className="flex-1 overflow-hidden px-4 pb-4">
              <div className="bg-gray-800 rounded-[36px] p-2 h-full shadow-xl flex items-center justify-center">
                <div className="bg-white rounded-[28px] overflow-hidden w-full max-w-[375px] h-full flex flex-col">
                  {/* 手机状态栏 */}
                  <div className="bg-gray-900 px-4 py-2 flex items-center justify-between text-white text-xs shrink-0">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 border border-white rounded-sm relative">
                        <div className="absolute inset-0.5 right-1 bg-white rounded-sm" />
                      </div>
                      <div className="w-4 h-2 border border-white rounded-sm" />
                      <div className="w-4 h-2 border border-white rounded-sm" />
                    </div>
                  </div>

                  {/* 公众号内容区 */}
                  <div 
                    ref={previewRef}
                    onScroll={handlePreviewScroll}
                    className="flex-1 overflow-y-auto bg-white"
                    style={previewStyles}
                  >
                    {/* 文章头部 */}
                    <div className="px-4 pt-4">
                      <h1 
                        className="text-xl font-bold mb-3 leading-tight"
                        style={{ 
                          color: styles.accentColor,
                          fontSize: `${styles.h1Size}px`,
                          fontWeight: styles.h1Bold ? 'bold' : 'normal',
                          textAlign: styles.h1Align,
                        }}
                      >
                        {title}
                      </h1>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge 
                          className="text-xs px-2 py-0.5"
                          style={{ backgroundColor: styles.accentColor, color: '#fff' }}
                        >
                          原创
                        </Badge>
                        <span className="text-xs text-gray-500">文澜智作</span>
                      </div>
                    </div>

                    {/* 文章内容 */}
                    <div className="px-4">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => (
                            <h1 style={{ 
                              fontSize: `${styles.h1Size}px`, 
                              color: styles.h1Color, 
                              fontWeight: styles.h1Bold ? 'bold' : 'normal',
                              textAlign: styles.h1Align,
                              marginTop: styles.paragraphSpacing,
                              marginBottom: styles.paragraphSpacing / 2,
                            }}>
                              {children}
                            </h1>
                          ),
                          h2: ({children}) => (
                            <h2 style={{ 
                              fontSize: `${styles.h2Size}px`, 
                              color: styles.h2Color, 
                              fontWeight: styles.h2Bold ? 'bold' : 'normal',
                              textAlign: styles.h2Align,
                              marginTop: styles.paragraphSpacing,
                              marginBottom: styles.paragraphSpacing / 2,
                            }}>
                              {children}
                            </h2>
                          ),
                          h3: ({children}) => (
                            <h3 style={{ 
                              fontSize: `${styles.fontSize + 2}px`, 
                              color: styles.textColor, 
                              fontWeight: '600',
                              marginTop: styles.paragraphSpacing * 0.8,
                              marginBottom: styles.paragraphSpacing / 3,
                            }}>
                              {children}
                            </h3>
                          ),
                          p: ({children}) => (
                            <p style={{ 
                              marginBottom: styles.paragraphSpacing,
                              textAlign: styles.firstLineIndent ? 'justify' : 'left',
                              textIndent: styles.firstLineIndent ? '2em' : 0,
                            }}>
                              {children}
                            </p>
                          ),
                          ul: ({children}) => (
                            <ul style={{ 
                              marginBottom: styles.paragraphSpacing,
                              paddingLeft: '1.5em',
                            }}>
                              {children}
                            </ul>
                          ),
                          ol: ({children}) => (
                            <ol style={{ 
                              marginBottom: styles.paragraphSpacing,
                              paddingLeft: '1.5em',
                            }}>
                              {children}
                            </ol>
                          ),
                          li: ({children}) => (
                            <li style={{ 
                              marginBottom: styles.paragraphSpacing / 2,
                              lineHeight: styles.lineHeight,
                            }}>
                              {children}
                            </li>
                          ),
                          blockquote: ({children}) => (
                            <blockquote 
                              style={{ 
                                borderLeft: `4px solid ${styles.quoteBorderColor}`,
                                paddingLeft: '12px',
                                margin: `${styles.paragraphSpacing}px 0`,
                                color: '#6b7280',
                                fontStyle: 'italic',
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                padding: '12px',
                                borderRadius: '4px',
                              }}
                            >
                              {styles.quoteIcon && (
                                <div style={{ fontSize: '24px', color: styles.quoteBorderColor, marginBottom: '4px' }}>"</div>
                              )}
                              {children}
                            </blockquote>
                          ),
                          strong: ({children}) => (
                            <strong style={{ 
                              fontWeight: '600', 
                              color: styles.boldColor 
                            }}>
                              {children}
                            </strong>
                          ),
                          em: ({children}) => <em>{children}</em>,
                          hr: () => (
                            <hr className={getDividerStyle()} />
                          ),
                          img: ({src, alt}) => (
                            <img 
                              src={src} 
                              alt={alt} 
                              style={{ 
                                width: '100%',
                                borderRadius: `${styles.imageRadius}px`,
                                margin: `${styles.imageSpacing}px 0`,
                              }}
                            />
                          ),
                          a: ({href, children}) => (
                            <a href={href} style={{ color: styles.accentColor, textDecoration: 'underline' }}>{children}</a>
                          ),
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>

                    {/* 底部工具栏 */}
                    <div className="border-t border-gray-100 p-4 bg-gray-50 mt-4">
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
                          <span className="text-lg">♥</span>
                          <span className="text-xs">赞</span>
                        </button>
                        <button className="flex flex-col items-center gap-0.5 text-gray-500">
                          <span className="text-lg">↔</span>
                          <span className="text-xs">分享</span>
                        </button>
                        <button className="flex flex-col items-center gap-0.5 text-gray-500">
                          <span className="text-lg">★</span>
                          <span className="text-xs">收藏</span>
                        </button>
                        <button className="flex flex-col items-center gap-0.5 text-gray-500">
                          <span className="text-lg">✎</span>
                          <span className="text-xs">评论</span>
                        </button>
                      </div>
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

// 包装组件处理 Suspense
export default function FormatArticlePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-2" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <FormatArticleContent />
    </Suspense>
  );
}
