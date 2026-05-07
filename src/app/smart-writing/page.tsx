'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  PenTool,
  Wand2,
  FileText,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Settings,
  FolderOpen,
  FolderPlus,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  BookOpen,
  X,
  FileWarning,
  SendHorizontal,
  Check,
  Eye,
  Save,
  Clock,
  AlertCircle,
  Download,
  Lightbulb,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 文章类型定义
type GenerateProgress = 'idle' | 'title' | 'content' | 'images' | 'done' | 'failed';

interface Article {
  id: number | string;
  title: string;
  content: string;
  image_urls?: string[];
  images?: string[]; // 数据库 images 字段
  group_id: string | null;
  group_name?: string;
  status: 'generating' | 'generated' | 'failed' | 'draft' | 'published';
  push_status: 'pending' | 'success' | 'failed';
  created_at: string;
  updated_at: string;
  generate_progress?: GenerateProgress;
}

// 分组类型定义
interface ArticleGroup {
  id: string;
  name: string;
  article_count: number;
  created_at: string;
}

// 提示词模板类型
interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  created_at?: string;
}

export default function SmartWritingPage() {
  // 文章列表状态
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  // 分组状态
  const [groups, setGroups] = useState<ArticleGroup[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<ArticleGroup | null>(null);
  
  // 创作弹窗状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleTopic, setArticleTopic] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [imageSource, setImageSource] = useState<'ai' | 'original'>('ai');
  const [imageCount, setImageCount] = useState<number>(3);
  
  // 投喂素材状态
  const [enableMaterial, setEnableMaterial] = useState(false);
  const [materialLinks, setMaterialLinks] = useState('');
  const [materialRequirements, setMaterialRequirements] = useState('');
  
  // 提示词列表
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 当前查看的文章
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);

  // 加载文章列表
  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/articles', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setArticles(data.articles || []);
        }
      }
    } catch (error) {
      console.error('加载文章失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载分组列表
  const loadGroups = async () => {
    try {
      const response = await fetch('/api/article-groups', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGroups(data.groups || []);
        }
      }
    } catch (error) {
      console.error('加载分组失败:', error);
    }
  };

  // 加载提示词模板
  const loadPromptTemplates = async () => {
    try {
      const response = await fetch('/api/prompt-templates', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPromptTemplates(data.templates || []);
        }
      }
    } catch (error) {
      console.error('加载提示词失败:', error);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadArticles();
    loadGroups();
    loadPromptTemplates();
  }, []);

  // 计算统计信息
  const totalArticles = articles.length;
  const todayCount = articles.filter(a => {
    const today = new Date().toDateString();
    return new Date(a.created_at).toDateString() === today;
  }).length;

  const groupArticleCount = groups.reduce((sum, g) => sum + g.article_count, 0);

  // 筛选文章
  const filteredArticles = articles.filter(article => {
    // 分组筛选
    if (selectedGroup !== null && article.group_id !== selectedGroup) {
      return false;
    }
    
    // 状态筛选
    switch (selectedFilter) {
      case 'generating':
        return article.status === 'generating';
      case 'generated':
        return article.status === 'generated' && article.push_status !== 'success';
      case 'failed':
        return article.status === 'failed';
      case 'draft':
        return article.status === 'generated' && article.push_status !== 'success';
      case 'published':
        return article.push_status === 'success';
      default:
        return true;
    }
  });

  // 创建分组
  const handleCreateGroup = async () => {

    if (!newGroupName.trim()) return;
    
    try {
      const response = await fetch('/api/article-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newGroupName })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGroups([...groups, data.group]);
          setNewGroupName('');
        }
      }
    } catch (error) {
      console.error('创建分组失败:', error);
    }
  };

  // 更新分组
  const handleUpdateGroup = async () => {

    if (!editingGroup || !newGroupName.trim()) return;
    
    try {
      const response = await fetch(`/api/article-groups?id=${editingGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newGroupName })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, name: newGroupName } : g));
          setEditingGroup(null);
          setNewGroupName('');
        }
      }
    } catch (error) {
      console.error('更新分组失败:', error);
    }
  };

  // 删除分组
  const handleDeleteGroup = async (groupId: string) => {

    if (!confirm('确定要删除该分组吗？')) return;
    
    try {
      const response = await fetch(`/api/article-groups?id=${groupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGroups(groups.filter(g => g.id !== groupId));
        }
      }
    } catch (error) {
      console.error('删除分组失败:', error);
    }
  };

  // 保存编辑的文章
  const handleSaveEdit = async () => {

    if (!editingArticle) return;
    
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingArticle.id,
          title: editingArticle.title,
          content: editingArticle.content,
          images: editingArticle.images || editingArticle.image_urls,
          group_id: editingArticle.group_id,
          group_name: editingArticle.group_name,
          status: editingArticle.status,
          push_status: editingArticle.push_status
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setArticles(articles.map(a => a.id === editingArticle.id ? data.article : a));
          setShowCreateDialog(false);
          setEditingArticle(null);
          alert('保存成功');
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请稍后重试');
    }
  };

  // 开始创作
  const handleStartCreate = async () => {
    if (!articleTopic) {
      alert('请输入文章主题');
      return;
    }

    if (!selectedPromptId) {
      alert('请选择提示词');
      return;
    }
    
    if (!selectedGroupId) {
      alert('请选择分组');
      return;
    }

    setShowCreateDialog(false);
    
    // 先获取选中的提示词
    const prompt = promptTemplates.find(p => p.id.toString() === selectedPromptId);
    
    // 创建一个临时的"生成中"文章
    const tempArticle: Article = {
      id: Date.now(),
      title: articleTopic || '',
      content: '...',
      images: [],
      group_id: null, // 分组信息通过 group_name 显示
      group_name: groups.find(g => g.id === selectedGroupId)?.name || '默认分组',
      status: 'generating',
      push_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      generate_progress: 'title'
    };
    
    setArticles(prev => [tempArticle, ...prev]);

    // 后台异步生成文章
    try {
      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId: selectedPromptId,
          title: articleTitle || undefined,
          topic: articleTopic, // 文章主题作为搜索关键词
          searchEnabled: true,
          imageSource,
          imageCount: imageSource === 'ai' ? imageCount : 0,
          enableMaterial,
          materialLinks: enableMaterial ? materialLinks : undefined,
          materialRequirements: enableMaterial ? materialRequirements : undefined,
          groupName: groups.find(g => g.id === selectedGroupId)?.name || selectedGroupId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // API 已经保存了文章，直接使用返回的数据
          // 图片单独存储在 images 字段，不插入到 content 中
          const savedArticle = data.data;
          
          // 构建最终的文章对象（从API返回的数据）
          const finalArticle: Article = {
            id: savedArticle?.id || tempArticle.id,
            title: savedArticle?.title || articleTitle || '未命名文章',
            content: savedArticle?.content || '',
            images: savedArticle?.images || [],
            image_urls: savedArticle?.images || [],
            group_id: null,
            group_name: groups.find(g => g.id === selectedGroupId)?.name || savedArticle?.group_name || '默认分组',
            status: 'completed',
            push_status: 'pending',
            created_at: tempArticle.created_at,
            updated_at: new Date().toISOString(),
            generate_progress: 'done'
          };
          
          // 找到临时文章的位置并替换
          setArticles(prevArticles => {
            const index = prevArticles.findIndex(a => a.id === tempArticle.id);
            if (index !== -1) {
              const newArticles = [...prevArticles];
              newArticles[index] = finalArticle;
              return newArticles;
            }
            // 如果没找到临时文章（不应该发生），直接在开头添加
            return [finalArticle, ...prevArticles];
          });
        } else {
          // 生成失败，更新状态
          setArticles(prevArticles => {
            const index = prevArticles.findIndex(a => a.id === tempArticle.id);
            if (index !== -1) {
              const newArticles = [...prevArticles];
              newArticles[index] = { ...newArticles[index], status: 'failed' };
              return newArticles;
            }
            return prevArticles;
          });
          alert('生成失败，请稍后重试');
        }
      } else {
        // 请求失败，更新状态
        setArticles(prevArticles => {
          const index = prevArticles.findIndex(a => a.id === tempArticle.id);
          if (index !== -1) {
            const newArticles = [...prevArticles];
            newArticles[index] = { ...newArticles[index], status: 'failed' };
            return newArticles;
          }
          return prevArticles;
        });
        const errorText = await response.text();
        console.error('生成失败:', errorText);
        alert('生成失败，请稍后重试');
      }
    } catch (error) {
      console.error('生成失败:', error);
      // 请求失败，更新状态
      setArticles(prevArticles => {
        const index = prevArticles.findIndex(a => a.id === tempArticle.id);
        if (index !== -1) {
          const newArticles = [...prevArticles];
          newArticles[index] = { ...newArticles[index], status: 'failed' };
          return newArticles;
        }
        return prevArticles;
      });
      alert('生成失败，请稍后重试');
    }
    
    // 重置表单
    setArticleTitle('');
    setSelectedPromptId('');
    setSelectedGroupId('');
    setEnableMaterial(false);
    setMaterialLinks('');
    setMaterialRequirements('');
  };

  // 推送到微信草稿箱
  const handlePushToWechat = async (article: Article) => {

    try {
      const response = await fetch('/api/push-to-wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          imageUrls: article.image_urls
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setArticles(articles.map(a => 
            a.id === article.id ? { ...a, push_status: 'success' } : a
          ));
          alert('推送成功！文章已发送到公众号草稿箱');
        } else {
          alert(data.message || '推送失败');
        }
      }
    } catch (error) {
      console.error('推送失败:', error);
      alert('推送失败，请稍后重试');
    }
  };

  // 编辑文章 - 跳转到一键排版页面
  const handleEditArticle = (article: Article) => {
    // 将文章数据编码到 URL 参数中
    const articleData = encodeURIComponent(JSON.stringify(article));
    window.location.href = `/format-article?article=${articleData}`;
  };

  // 保存文章到本地
  const handleSaveArticle = (article: Article) => {
    // 创建 Markdown 格式的内容
    const markdown = `# ${article.title}\n\n${article.content}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('文章已保存为 Markdown 文件');
  };

  // 删除文章
  const handleDeleteArticle = async (id: string) => {

    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      const response = await fetch(`/api/articles?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setArticles(articles.filter(a => a.id !== id));
        alert('删除成功');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  // 获取状态标签
  const getStatusBadge = (article: Article) => {
    // 生成中只显示徽章，不显示额外文字
    if (article.status === 'generating') {
      return <Badge className="bg-blue-500 text-white"><Loader2 className="h-3 w-3 mr-1 animate-spin" />生成中</Badge>;
    }
    if (article.status === 'failed') {
      return <Badge className="bg-red-500 text-white"><AlertCircle className="h-3 w-3 mr-1" />失败</Badge>;
    }
    if (article.push_status === 'success') {
      return <Badge className="bg-green-500 text-white"><Check className="h-3 w-3 mr-1" />已推送</Badge>;
    }
    return <Badge className="bg-gray-500 text-white"><Clock className="h-3 w-3 mr-1" />未推送</Badge>;
  };

  // 处理文章内容：过滤Markdown图片格式，返回纯文本和图片URL数组
  const processArticleContent = (content: string, images: string[] = []) => {
    // 过滤掉所有 ![图片描述](url) 格式的 Markdown 图片
    const textContent = content.replace(/!\[.*?\]\(.*?\)/g, '').trim();
    return { textContent, images };
  };

  // 多样化排版主题定义
  const layoutThemes = [
    // 主题1：现代简约
    {
      name: '现代简约',
      title: { align: 'left', style: 'border-bottom', color: 'border-blue-300' },
      icon: { bg: 'bg-blue-500', shape: 'rounded-full' },
      accent: 'text-blue-600',
      bg: 'bg-white',
      quote: 'border-l-4 border-blue-500 pl-4 italic'
    },
    // 主题2：活力橙
    {
      name: '活力橙',
      title: { align: 'left', style: 'background', color: 'bg-orange-50' },
      icon: { bg: 'bg-orange-500', shape: 'rounded-lg' },
      accent: 'text-orange-600',
      bg: 'bg-white',
      quote: 'border-l-4 border-orange-500 pl-4 italic'
    },
    // 主题3：清新绿
    {
      name: '清新绿',
      title: { align: 'center', style: 'text', color: 'text-emerald-600' },
      icon: { bg: 'bg-emerald-500', shape: 'rounded-full' },
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50/30',
      quote: 'border-l-4 border-emerald-500 pl-4 italic'
    },
    // 主题4：优雅紫
    {
      name: '优雅紫',
      title: { align: 'left', style: 'line', color: 'border-purple-300' },
      icon: { bg: 'bg-purple-500', shape: 'rounded-xl' },
      accent: 'text-purple-600',
      bg: 'bg-white',
      quote: 'border-l-4 border-purple-500 pl-4 italic'
    },
    // 主题5：商务蓝
    {
      name: '商务蓝',
      title: { align: 'left', style: 'solid', color: 'border-slate-700' },
      icon: { bg: 'bg-slate-600', shape: 'rounded-full' },
      accent: 'text-slate-700',
      bg: 'bg-slate-50/50',
      quote: 'border-l-4 border-slate-600 pl-4 italic'
    },
    // 主题6：热情红
    {
      name: '热情红',
      title: { align: 'left', style: 'glow', color: 'text-rose-600' },
      icon: { bg: 'bg-rose-500', shape: 'rounded-lg' },
      accent: 'text-rose-600',
      bg: 'bg-white',
      quote: 'border-l-4 border-rose-500 pl-4 italic'
    },
    // 主题7：金色奢华
    {
      name: '金色奢华',
      title: { align: 'center', style: 'underline', color: 'text-amber-700' },
      icon: { bg: 'bg-amber-500', shape: 'rounded-full' },
      accent: 'text-amber-600',
      bg: 'bg-amber-50/30',
      quote: 'border-l-4 border-amber-500 pl-4 italic'
    },
    // 主题8：科技蓝
    {
      name: '科技蓝',
      title: { align: 'left', style: 'gradient', color: 'bg-gradient-to-r from-cyan-500 to-blue-500' },
      icon: { bg: 'bg-cyan-500', shape: 'rounded-full' },
      accent: 'text-cyan-600',
      bg: 'bg-cyan-50/30',
      quote: 'border-l-4 border-cyan-500 pl-4 italic'
    },
    // 主题9：少女粉
    {
      name: '少女粉',
      title: { align: 'left', style: 'dotted', color: 'border-pink-300' },
      icon: { bg: 'bg-pink-500', shape: 'rounded-full' },
      accent: 'text-pink-600',
      bg: 'bg-pink-50/30',
      quote: 'border-l-4 border-pink-500 pl-4 italic'
    },
    // 主题10：森林绿
    {
      name: '森林绿',
      title: { align: 'center', style: 'leaf', color: 'text-green-700' },
      icon: { bg: 'bg-green-600', shape: 'rounded-lg' },
      accent: 'text-green-600',
      bg: 'bg-green-50/30',
      quote: 'border-l-4 border-green-600 pl-4 italic'
    },
  ];

  // 多种标题组件样式
  const titleStyles = [
    // 样式1：左侧带装饰线
    ({ content, idx, theme, iconStyle }: any) => (
      <div className="flex items-center gap-3 mt-6 mb-4">
        <div className={`${iconStyle.bg} ${iconStyle.shape} w-8 h-8 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {idx + 1}
        </div>
        <h3 className={`text-base font-semibold ${theme.accent}`}>{content}</h3>
        <div className={`flex-1 h-px ${theme.title.color}`}></div>
      </div>
    ),
    // 样式2：居中带背景
    ({ content, idx, theme, iconStyle }: any) => (
      <div className="mt-6 mb-4 text-center">
        <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${theme.title.color} bg-opacity-10`}>
          <span className={`${iconStyle.bg} ${iconStyle.shape} w-8 h-8 flex items-center justify-center text-white font-bold text-sm`}>
            {idx + 1}
          </span>
          <h3 className={`text-base font-semibold ${theme.accent}`}>{content}</h3>
        </div>
      </div>
    ),
    // 样式3：左侧竖线
    ({ content, idx, theme, iconStyle }: any) => (
      <div className="flex items-start gap-3 mt-6 mb-4">
        <div className={`w-1.5 h-8 ${iconStyle.bg} rounded-full flex-shrink-0 mt-0.5`}></div>
        <div>
          <span className={`text-xs font-medium ${theme.accent} opacity-60`}>PART {idx + 1}</span>
          <h3 className={`text-base font-semibold ${theme.accent}`}>{content}</h3>
        </div>
      </div>
    ),
    // 样式4：卡片式
    ({ content, idx, theme, iconStyle }: any) => (
      <div className={`mt-6 mb-4 p-4 rounded-xl border-l-4 ${theme.title.color} ${theme.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`${iconStyle.bg} ${iconStyle.shape} w-8 h-8 flex items-center justify-center text-white font-bold text-sm`}>
            {idx + 1}
          </div>
          <h3 className={`text-base font-semibold ${theme.accent}`}>{content}</h3>
        </div>
      </div>
    ),
    // 样式5：下划线式
    ({ content, idx, theme, iconStyle }: any) => (
      <div className="mt-6 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className={`${iconStyle.bg} ${iconStyle.shape} w-8 h-8 flex items-center justify-center text-white font-bold text-sm`}>
            {idx + 1}
          </span>
          <h3 className={`text-base font-semibold ${theme.accent}`}>{content}</h3>
        </div>
        <div className={`h-0.5 w-full ${theme.title.color}`}></div>
      </div>
    ),
    // 样式6：数字突出
    ({ content, idx, theme, iconStyle }: any) => (
      <div className="mt-6 mb-4 flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${theme.accent} opacity-30`}>{String(idx + 1).padStart(2, '0')}</span>
        <h3 className={`text-base font-semibold ${theme.accent}`}>{content}</h3>
      </div>
    ),
  ];

  // 多种图片展示样式
  const imageStyles = [
    'rounded-lg shadow-md hover:shadow-lg transition-shadow',
    'rounded-xl shadow-lg',
    'rounded-2xl shadow-sm border-2 border-white',
    'rounded-lg shadow-blue-200 shadow-lg',
    'rounded-xl shadow-orange-200 shadow-lg',
    'rounded-full w-3/4 mx-auto shadow-lg',
    'rounded-none shadow-md',
    'rounded-lg shadow-lg border-l-4 border-r-4 border-blue-500',
  ];

  // 多种分隔线样式
  const separatorStyles = [
    ({ theme }: any) => <hr className="my-6 border-gray-200" />,
    ({ theme }: any) => (
      <div className="flex items-center justify-center my-6 gap-2">
        <span className={`w-8 h-px ${theme.title.color}`}></span>
        <span className={`w-2 h-2 ${theme.icon.bg} rounded-full`}></span>
        <span className={`w-8 h-px ${theme.title.color}`}></span>
      </div>
    ),
    ({ theme }: any) => (
      <div className="my-6 text-center">
        <span className={`${theme.accent} text-xs tracking-widest`}>◆ ◆ ◆</span>
      </div>
    ),
    ({ theme }: any) => (
      <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
    ),
    ({ theme }: any) => (
      <div className="my-6 flex items-center gap-3">
        <div className={`h-px flex-1 ${theme.title.color}`}></div>
        <span className={`${theme.accent}`}>•</span>
        <div className={`h-px flex-1 ${theme.title.color}`}></div>
      </div>
    ),
  ];

  // 多种结尾样式
  const endStyles = [
    () => <div className="mt-8 pt-4 border-t border-gray-200 text-center"><span className="text-xs text-gray-400">— END —</span></div>,
    () => <div className="mt-8 pt-4 text-center"><span className="text-xs text-gray-400 tracking-widest">· 完 ·</span></div>,
    () => <div className="mt-8 py-4 text-center"><span className="text-xs text-gray-400">感谢阅读</span></div>,
    () => <div className="mt-8 pt-4 border-t border-gray-200 text-center"><span className="text-xs text-gray-400">~ ~ ~</span></div>,
    () => <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center"><span className="text-xs text-gray-500">— 完结 —</span></div>,
  ];

  // 多种段落样式
  const paragraphStyles = [
    'text-gray-700 leading-relaxed text-base',
    'text-gray-600 leading-loose text-base',
    'text-gray-700 leading-7 text-base',
    'text-gray-700 leading-relaxed text-[15px]',
  ];

  // 渲染文章内容组件（精美排版）
  const ArticleContentWithImages = ({ article }: { article: Article }) => {
    // 10种精美排版主题（结构兼容 layoutThemes）
    const themes = [
      { bg: 'from-blue-50 to-blue-100', accent: 'text-blue-600', secondary: '#60a5fa', text: '#1e40af', light: '#dbeafe', icon: { bg: 'bg-blue-500', shape: 'rounded-full' }, title: { color: 'border-blue-300' }, name: '现代简约蓝' },
      { bg: 'from-orange-50 to-orange-100', accent: 'text-orange-600', secondary: '#fb923c', text: '#c2410c', light: '#ffedd5', icon: { bg: 'bg-orange-500', shape: 'rounded-lg' }, title: { color: 'border-orange-300' }, name: '活力橙' },
      { bg: 'from-green-50 to-green-100', accent: 'text-emerald-600', secondary: '#4ade80', text: '#166534', light: '#dcfce7', icon: { bg: 'bg-emerald-500', shape: 'rounded-full' }, title: { color: 'border-emerald-300' }, name: '清新绿' },
      { bg: 'from-purple-50 to-purple-100', accent: 'text-purple-600', secondary: '#c084fc', text: '#7e22ce', light: '#f3e8ff', icon: { bg: 'bg-purple-500', shape: 'rounded-xl' }, title: { color: 'border-purple-300' }, name: '优雅紫' },
      { bg: 'from-slate-50 to-slate-100', accent: 'text-slate-700', secondary: '#64748b', text: '#1e293b', light: '#f1f5f9', icon: { bg: 'bg-slate-600', shape: 'rounded-full' }, title: { color: 'border-slate-700' }, name: '商务灰蓝' },
      { bg: 'from-rose-50 to-rose-100', accent: 'text-rose-600', secondary: '#fb7185', text: '#be123c', light: '#ffe4e6', icon: { bg: 'bg-rose-500', shape: 'rounded-lg' }, title: { color: 'border-rose-300' }, name: '热情红' },
      { bg: 'from-amber-50 to-amber-100', accent: 'text-amber-600', secondary: '#fbbf24', text: '#b45309', light: '#fef3c7', icon: { bg: 'bg-amber-500', shape: 'rounded-full' }, title: { color: 'border-amber-300' }, name: '金色奢华' },
      { bg: 'from-cyan-50 to-cyan-100', accent: 'text-cyan-600', secondary: '#22d3ee', text: '#0e7490', light: '#cffafe', icon: { bg: 'bg-cyan-500', shape: 'rounded-full' }, title: { color: 'border-cyan-300' }, name: '科技蓝' },
      { bg: 'from-pink-50 to-pink-100', accent: 'text-pink-600', secondary: '#f472b6', text: '#be185d', light: '#fce7f3', icon: { bg: 'bg-pink-500', shape: 'rounded-full' }, title: { color: 'border-pink-300' }, name: '少女粉' },
      { bg: 'from-emerald-50 to-emerald-100', accent: 'text-green-600', secondary: '#34d399', text: '#065f46', light: '#d1fae5', icon: { bg: 'bg-green-600', shape: 'rounded-lg' }, title: { color: 'border-green-300' }, name: '森林绿' },
    ];
    
    const { textContent, images } = processArticleContent(article.content || '', article.images || []);
    // 根据文章ID获取主题，确保索引有效
    const idHash = String(article.id || '0').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const themeIndex = Math.abs(idHash) % themes.length;
    const theme = themes[themeIndex] || themes[0]; // 兜底确保有主题
    
    // 解析文章内容，提取标题和段落
    const parseContent = (content: string) => {
      const lines = content.split('\n');
      const sections: { type: 'title' | 'paragraph' | 'separator'; content: string; level?: number }[] = [];
      let currentParagraph = '';
      
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        
        // 跳过空行，累积到当前段落
        if (!trimmed) {
          if (currentParagraph) {
            currentParagraph += '\n';
          }
          return;
        }
        
        // 检测分隔线
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          if (currentParagraph.trim()) {
            sections.push({ type: 'paragraph', content: currentParagraph.trim() });
            currentParagraph = '';
          }
          sections.push({ type: 'separator', content: '' });
          return;
        }
        
        // 检测标题 (# 开头的)
        if (trimmed.startsWith('#')) {
          // 先保存当前段落
          if (currentParagraph.trim()) {
            sections.push({ type: 'paragraph', content: currentParagraph.trim() });
            currentParagraph = '';
          }
          const level = trimmed.match(/^#+/)?.[0].length || 1;
          sections.push({ type: 'title', content: trimmed.replace(/^#+\s*/, ''), level });
        } else {
          // 添加到当前段落
          currentParagraph += (currentParagraph ? '\n' : '') + trimmed;
        }
      });
      
      // 保存最后一个段落
      if (currentParagraph.trim()) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
      }
      
      return sections;
    };
    
    const sections = parseContent(textContent);
    
    // 插入图片的策略（随机化）
    const getImageInsertIndices = (imgCount: number, sectionCount: number) => {
      if (imgCount === 0 || sectionCount === 0) return [];
      
      const indices: number[] = [];
      
      // 随机决定：开头 + 均匀 / 纯开头+结尾 / 纯均匀
      const pattern = Math.abs(String(article.id).charCodeAt(0) || 0) % 3;
      
      if (pattern === 0) {
        // 模式1：开头 + 结尾 + 均匀分布
        if (imgCount >= 1) indices.push(0);
        if (imgCount >= 2 && sectionCount > 1) indices.push(sectionCount - 1);
        
        const middleCount = imgCount - (imgCount >= 2 ? 2 : 1);
        if (middleCount > 0 && sectionCount > 2) {
          for (let i = 0; i < middleCount; i++) {
            const pos = Math.floor((i + 1) * (sectionCount - 1) / (middleCount + 1));
            if (!indices.includes(pos)) indices.push(pos);
          }
        }
      } else if (pattern === 1) {
        // 模式2：纯开头 + 均匀分布
        for (let i = 0; i < Math.min(imgCount, Math.ceil(sectionCount / 2)); i++) {
          const pos = Math.floor(i * sectionCount / Math.min(imgCount, Math.ceil(sectionCount / 2)));
          if (!indices.includes(pos)) indices.push(pos);
        }
      } else {
        // 模式3：纯均匀分布
        for (let i = 0; i < imgCount; i++) {
          const pos = Math.floor((i + 0.5) * sectionCount / imgCount);
          if (!indices.includes(pos) && pos < sectionCount) indices.push(pos);
        }
      }
      
      return indices.sort((a, b) => a - b);
    };
    
    const imageIndices = getImageInsertIndices(images.length, sections.length);
    let imageIdx = 0;
    
    // 序号样式随机
    const getIconStyle = (idx: number) => {
      const styles = [
        { bg: 'bg-blue-500', shape: 'rounded-full', size: 'w-8 h-8' },
        { bg: 'bg-orange-500', shape: 'rounded-lg', size: 'w-10 h-10' },
        { bg: 'bg-emerald-500', shape: 'rounded-full', size: 'w-7 h-7' },
        { bg: 'bg-purple-500', shape: 'rounded-xl', size: 'w-9 h-9' },
        { bg: 'bg-rose-500', shape: 'rounded-full', size: 'w-8 h-8' },
      ];
      const hash = String(article.id).split('').reduce((a, b) => a + b.charCodeAt(0), 0) + idx;
      return styles[hash % styles.length];
    };
    
    // 图片样式随机
    const getImageStyle = (idx: number) => {
      const styles = [
        'rounded-lg shadow-md',
        'rounded-xl shadow-lg',
        'rounded-2xl shadow-sm',
        'rounded-lg shadow-blue-200',
        'rounded-xl shadow-orange-200',
      ];
      const hash = String(article.id).split('').reduce((a, b) => a + b.charCodeAt(0), 0) + idx * 2;
      return styles[hash % styles.length];
    };
    
  // 渲染组件
  return (
    <div className="article-content">
      {sections.map((section, idx) => {
        const element: React.ReactNode[] = [];
        
        // 在段落前插入图片
        while (imageIdx < imageIndices.length && imageIndices[imageIdx] === idx && imageIdx < images.length) {
          element.push(
            <div key={`img-wrap-${imageIdx}`} className="my-6">
              <img 
                src={images[imageIdx]} 
                alt={`配图${imageIdx + 1}`} 
                className={`w-full ${imageStyles[(Math.abs(String(article.id).charCodeAt(imageIdx % 10) || 0) + imageIdx) % imageStyles.length]}`} 
              />
            </div>
          );
          imageIdx++;
        }
        
        if (section.type === 'separator') {
          const SepComponent = separatorStyles[(idx + Math.abs(String(article.id).charCodeAt(0) || 0)) % separatorStyles.length];
          element.push(<SepComponent key={`sep-${idx}`} theme={theme} />);
        } else if (section.type === 'title') {
          const level = section.level || 1;
          const isMainTitle = level === 1;
          
          if (isMainTitle) {
            // 一级标题：使用多种标题样式
            const TitleComponent = titleStyles[(idx + Math.abs(String(article.id).charCodeAt(0) || 0)) % titleStyles.length];
            element.push(
              <TitleComponent 
                key={`title-${idx}`} 
                content={section.content} 
                idx={idx} 
                theme={theme} 
                iconStyle={theme.icon}
              />
            );
          } else {
            // 二级标题：简洁样式
            element.push(
              <div key={`title-${idx}`} className="flex items-center gap-2 mt-6 mb-3">
                <span className={`w-1.5 h-6 ${theme.icon.bg} rounded-full`}></span>
                <h3 className={`text-lg font-semibold ${theme.accent}`}>
                  {section.content}
                </h3>
              </div>
            );
          }
        } else if (section.type === 'paragraph') {
          // 处理段落中的强调文字
          const processedContent = section.content
            .replace(/\*\*(.*?)\*\*/g, `<strong class="${theme.accent} font-semibold">$1</strong>`)
            .replace(/__(.*?)__/g, `<strong class="${theme.accent} font-semibold">$1</strong>`);
          
          const paraStyle = paragraphStyles[(idx + Math.abs(String(article.id).charCodeAt(0) || 0)) % paragraphStyles.length];
          element.push(
            <p key={`para-${idx}`} className={paraStyle}>
              <span dangerouslySetInnerHTML={{ __html: processedContent }} />
            </p>
          );
        }
        
        return <div key={`section-${idx}`}>{element}</div>;
      })}
      
      {/* 在结尾插入剩余图片 */}
      {images.slice(imageIdx).map((img, i) => (
        <div key={`img-end-${i}`} className="my-6">
          <img 
            src={img} 
            alt={`配图${imageIdx + i + 1}`} 
            className={`w-full ${imageStyles[(imageIdx + i) % imageStyles.length]}`} 
          />
        </div>
      ))}
      
      {/* 底部装饰 - 使用多种结尾样式 */}
      {(() => {
        const EndComponent = endStyles[Math.abs(String(article.id).charCodeAt(String(article.id).length - 1) || 0) % endStyles.length];
        return <EndComponent />;
      })()}
    </div>
  );
  };

  // 简单的文本渲染（无图片时）
  const SimpleArticleContent = ({ content }: { content: string }) => {
    const sections = content.split(/\n\n+/).filter(p => p.trim());
    
    return (
      <div className="space-y-4">
        {sections.map((section, idx) => (
          <p key={idx} className="text-gray-700 leading-relaxed">
            {section}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">智能创作</h1>
                <p className="text-sm text-gray-500">AI 驱动的内容创作</p>
              </div>
            </div>
            <Button 
              onClick={() => {
                
                setShowCreateDialog(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              开始创作
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 左侧侧边栏 - 文章分组 */}
          <div className="w-64 flex-shrink-0">
            <Card className="p-4">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-orange-500" />
                  文章分组
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {groups.length}个分组·{totalArticles}篇文章
                </p>
              </div>

              {/* 全部文章按钮 */}
              <Button
                variant={selectedGroup === null ? 'default' : 'outline'}
                className={cn(
                  'w-full justify-start mb-2',
                  selectedGroup === null && 'bg-orange-500 hover:bg-orange-600 text-white'
                )}
                onClick={() => setSelectedGroup(null)}
              >
                <FileText className="h-4 w-4 mr-2" />
                全部文章
              </Button>

              {/* 分组列表 */}
              {groups.map(group => (
                <Button
                  key={group.id}
                  variant={selectedGroup === group.id ? 'default' : 'outline'}
                  className={cn(
                    'w-full justify-start mb-2',
                    selectedGroup === group.id && 'bg-orange-500 hover:bg-orange-600 text-white'
                  )}
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {group.name}
                  <Badge variant="secondary" className="ml-auto">{group.article_count}</Badge>
                </Button>
              ))}

              {/* 管理分组按钮 */}
              <Button
                variant="outline"
                className="w-full justify-start mt-4"
                onClick={() => {
                  
                  setShowGroupDialog(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                管理分组
              </Button>
            </Card>
          </div>

          {/* 右侧主内容区 */}
          <div className="flex-1">
            {/* 顶部信息栏 */}
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    今日已生成 <span className="font-semibold text-orange-500">{todayCount}</span> / <span className="font-semibold">10</span> 篇
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">筛选:</span>
                  <div className="flex gap-1">
                    {[
                      { key: 'all', label: '全部' },
                      { key: 'generating', label: '生成中' },
                      { key: 'generated', label: '已生成' },
                      { key: 'failed', label: '生成失败' },
                      { key: 'draft', label: '未推送' },
                      { key: 'published', label: '已推送' }
                    ].map(filter => (
                      <Button
                        key={filter.key}
                        size="sm"
                        variant={selectedFilter === filter.key ? 'default' : 'outline'}
                        className={cn(
                          selectedFilter === filter.key && 'bg-orange-500 hover:bg-orange-600'
                        )}
                        onClick={() => setSelectedFilter(filter.key)}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={loadArticles}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  刷新
                </Button>
              </div>
            </Card>

            {/* 文章列表或空状态 */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : filteredArticles.length === 0 ? (
              <Card className="p-12 text-center">
                <FileWarning className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无文章</h3>
                <p className="text-sm text-gray-500 mb-6">您还没有创作任何文章</p>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  开始创作
                </Button>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* 表头 */}
                <div className="bg-gray-50 border-b px-4 py-3 grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-600">
                  <div className="col-span-1">选择</div>
                  <div className="col-span-1">封面</div>
                  <div className="col-span-2">文章标题</div>
                  <div className="col-span-1">分组</div>
                  <div className="col-span-1">生成状态</div>
                  <div className="col-span-1">推送状态</div>
                  <div className="col-span-2">更新时间</div>
                  <div className="col-span-3 flex justify-center">操作</div>
                </div>
                {/* 表格内容 */}
                {filteredArticles.map(article => (
                  <div 
                    key={article.id} 
                    className="border-b last:border-b-0 px-4 py-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-gray-50"
                  >
                    {/* 选择 */}
                    <div className="col-span-1">
                      <Checkbox checked={false} onCheckedChange={() => {}} />
                    </div>
                    {/* 封面 */}
                    <div className="col-span-1">
                      {Array.isArray(article.images) && article.images.length > 0 ? (
                        <img 
                          src={article.images[0]} 
                          alt="封面" 
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    {/* 文章标题 */}
                    <div className="col-span-2">
                      <p className="font-medium text-gray-900 truncate">{article.title}</p>
                    </div>
                    {/* 分组 */}
                    <div className="col-span-1">
                      <span className="text-gray-600 text-xs">
                        {article.group_name || '-'}
                      </span>
                    </div>
                    {/* 生成状态 */}
                    <div className="col-span-1">
                      {getStatusBadge(article)}
                    </div>
                    {/* 推送状态 */}
                    <div className="col-span-1 flex justify-center items-center">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        article.push_status === 'success' ? 'bg-green-500' :
                        article.push_status === 'failed' ? 'bg-red-500' :
                        'bg-gray-300'
                      }`} />
                    </div>
                    {/* 更新时间 */}
                    <div className="col-span-2">
                      <span className="text-gray-500 text-xs">
                        {new Date(article.updated_at).toLocaleDateString()} {new Date(article.updated_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {/* 操作 */}
                    <div className="col-span-3 flex items-center gap-2">
                      {/* 查看 */}
                      <button 
                        onClick={() => setViewingArticle(article)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors"
                      >
                        <Eye className="h-4 w-4 text-white" />
                        <span className="text-xs text-gray-700">查看</span>
                      </button>
                      
                      {/* 编辑 */}
                      <button 
                        onClick={() => handleEditArticle(article)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Edit className="h-4 w-4 text-gray-700" />
                        <span className="text-xs text-gray-700">编辑</span>
                      </button>
                      
                      {/* 推送 */}
                      <button 
                        onClick={() => handlePushToWechat(article)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Send className="h-4 w-4 text-gray-700" />
                        <span className="text-xs text-gray-700">推送</span>
                      </button>
                      
                      {/* 删除 */}
                      <button 
                        onClick={() => handleDeleteArticle(String(article.id))}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-gray-700" />
                        <span className="text-xs text-gray-700">删除</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 分组管理弹窗 */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              赛道分类管理
              <span className="text-sm font-normal text-gray-500 ml-2">管理您的分组·{groups.length}个</span>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {groups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{group.name}</span>
                    <Badge variant="secondary">{group.article_count}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        
                        setEditingGroup(group);
                        setNewGroupName(group.name);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        
                        handleDeleteGroup(group.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {groups.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无分组
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 编辑/新建分组 */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="输入分组名称"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Button 
                onClick={() => {
                  editingGroup ? handleUpdateGroup() : handleCreateGroup();
                }}
                disabled={!newGroupName.trim()}
              >
                {editingGroup ? '保存' : '创建'}
              </Button>
            </div>
            {editingGroup && (
              <Button 
                variant="ghost" 
                className="mt-2 w-full"
                onClick={() => {
                  setEditingGroup(null);
                  setNewGroupName('');
                }}
              >
                取消编辑
              </Button>
            )}
          </div>

          <Button 
            className="w-full mt-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            onClick={() => {
              
              handleCreateGroup();
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            创建新分组
          </Button>
        </DialogContent>
      </Dialog>

      {/* 文章创作设置弹窗 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              {editingArticle ? '智能生文' : '文章创作设置'}
            </DialogTitle>
          </DialogHeader>

          {/* AI提示 */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-700">
              AI辅助创作：AI仅为辅助工具，请在创作中融入您的想法、思考和个人经历，让内容更具独特性和真实性
            </p>
          </div>

          {/* 表单 */}
          <div className="space-y-4">
            {/* 文章主题 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  文章主题 <span className="text-red-500">*</span>
                </Label>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">输入你想创作的文章主题</p>
              <Input
                placeholder="输入你想创作的文章主题"
                value={articleTopic}
                onChange={(e) => setArticleTopic(e.target.value)}
              />
            </div>

            {/* 文章标题 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-4 w-4 text-yellow-500" />
                  文章标题
                </Label>
                <span className="text-xs text-gray-500">（选填，不填AI自动生成爆款标题）</span>
              </div>
              <Input
                placeholder="输入你想创作的文章标题"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
              />
            </div>

            {/* 选择提示词 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-4 w-4 text-yellow-500" />
                  选择提示词 <span className="text-red-500">*</span>
                </Label>
              </div>
              <p className="text-xs text-gray-500 mb-2">提示词决定文章的写作风格和框架</p>
              <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择提示词" />
                </SelectTrigger>
                <SelectContent>
                  {promptTemplates.map(prompt => (
                    <SelectItem key={prompt.id} value={prompt.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{prompt.category}</Badge>
                        {prompt.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 选择分组 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FolderOpen className="h-4 w-4 text-yellow-500" />
                  选择分组 <span className="text-red-500">*</span>
                </Label>
              </div>
              <p className="text-xs text-gray-500 mb-2">为生成的文章归类，方便在智能创作页面分组查看</p>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择分组" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 图片来源 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <ImageIcon className="h-4 w-4 text-yellow-500" />
                  图片来源
                </Label>
              </div>
              <p className="text-xs text-gray-500 mb-2">选择文章配图的来源方式</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="imageSource"
                    checked={imageSource === 'ai'}
                    onChange={() => setImageSource('ai')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">精准采集（AI生成）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="imageSource"
                    checked={imageSource === 'original'}
                    onChange={() => setImageSource('original')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">原文采集（原文章图片）</span>
                </label>
              </div>
            </div>

            {/* 图片数量 */}
            {imageSource === 'ai' && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <span className="text-yellow-500">📷</span>
                    图片数量(0-15)
                  </Label>
                </div>
                <p className="text-xs text-gray-500 mb-2">设置文章配图数量，0表示不配图</p>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={imageCount}
                  onChange={(e) => setImageCount(Math.min(15, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-32"
                />
              </div>
            )}

            {/* 投喂参考素材 */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-3 mb-3">
                <Checkbox
                  id="enableMaterial"
                  checked={enableMaterial}
                  onCheckedChange={(checked) => setEnableMaterial(checked as boolean)}
                />
                <Label htmlFor="enableMaterial" className="font-medium cursor-pointer flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-500" />
                  投喂参考素材
                </Label>
              </div>

              {enableMaterial && (
                <div className="space-y-4 pl-7">
                  {/* 什么时候需要投喂素材 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-blue-700">什么时候需要投喂素材?</span>
                    </div>
                    <div className="space-y-2 text-blue-600">
                      <div className="flex items-start gap-2">
                        <span className="text-green-500">✅</span>
                        <div>
                          <span className="font-medium">必须投喂:</span>
                          <span className="text-xs ml-1">实时信息类内容（汽车资讯、娱乐新闻、民生政策、社会热点等现实事件）</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400">○</span>
                        <div>
                          <span className="font-medium">可不投喂:</span>
                          <span className="text-xs ml-1">文学创作类内容（情感故事、星座解读、心灵鸡汤、生活日记等），AI语料库已足够丰富</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-500">⚠️</span>
                        <div>
                          <span className="font-medium">投喂好处:</span>
                          <span className="text-xs ml-1">基于投喂素材创作，内容观点不跑偏，关键词精准，更符合预期效果</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 参考素材链接 */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-1">
                      <span className="text-gray-500">🔗</span>
                      参考素材链接
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">支持公众号文章和今日头条文章链接，每行一个链接，建议1-3个参考素材最佳</p>
                    <Textarea
                      placeholder={`https://mp.weixin.qq.com/s/...\nhttps://www.toutiao.com/article/...\nhttps://...`}
                      value={materialLinks}
                      onChange={(e) => setMaterialLinks(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* 创作要求 */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-1">
                      <span className="text-purple-500">✨</span>
                      创作要求 / 大纲 / 观点素材
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">可针对需要创作的标题，输入您的创作要求、内容素材、个人观点或补充说明</p>
                    <Textarea
                      placeholder={`• 文章的核心观点是什么?\n• 需要强调哪些关键信息?\n• 希望达到什么效果? (如: 引发共鸣、提供价值、激发讨论)\n• 有哪些必须包含的内容要点?\n• 文章的结构安排建议`}
                      value={materialRequirements}
                      onChange={(e) => setMaterialRequirements(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => {
              setShowCreateDialog(false);
              setEditingArticle(null);
            }}>
              取消
            </Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              onClick={editingArticle ? handleSaveEdit : handleStartCreate}
              disabled={!selectedPromptId || !selectedGroupId || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingArticle ? '保存中...' : '创作中...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {editingArticle ? '保存编辑' : '开始创作'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 文章查看弹窗 */}
      <Dialog open={!!viewingArticle} onOpenChange={() => setViewingArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="text-base font-semibold">{viewingArticle?.title}</span>
              {viewingArticle && getStatusBadge(viewingArticle)}
            </DialogTitle>
            {viewingArticle?.group_name && (
              <p className="text-sm text-gray-500 mt-1">
                <FolderOpen className="h-3 w-3 inline mr-1" />
                {viewingArticle.group_name}
              </p>
            )}
          </DialogHeader>
          
          {viewingArticle && (
            <div className="space-y-4">
              {/* 文章内容（精美排版） */}
              <div className="bg-gray-50 rounded-lg p-6">
                {viewingArticle.content || viewingArticle.images?.length ? (
                  <ArticleContentWithImages article={viewingArticle} />
                ) : (
                  <SimpleArticleContent content={viewingArticle.content || '暂无内容'} />
                )}
              </div>
              
              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4 border-t">
                {viewingArticle.status === 'generated' && viewingArticle.push_status !== 'success' && (
                  <Button 
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    onClick={() => {
                      handlePushToWechat(viewingArticle);
                      setViewingArticle(null);
                    }}
                  >
                    <SendHorizontal className="h-4 w-4 mr-2" />
                    推送到公众号草稿箱
                  </Button>
                )}
                {viewingArticle.push_status === 'success' && (
                  <Button className="flex-1" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    已推送到公众号
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
