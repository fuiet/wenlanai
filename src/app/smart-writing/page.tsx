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
  Wand2,
  FileText,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Settings,
  FolderOpen,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  BookOpen,
  FileWarning,
  SendHorizontal,
  Check,
  Eye,
  Clock,
  AlertCircle,
  Lightbulb,
  Send,
  Star,
  Search,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 生成状态标签组件
// 简化状态：只有"生成中"和"已生成"两种状态，其他情况统一显示"待生成"
function StatusBadge({ status }: { status: string }) {
  // 生成中：pending、processing、generating
  if (status === 'generating' || status === 'pending' || status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-[#e6f7ff] text-[#1890ff] border border-[#91d5ff]">
        <span className="animate-spin">⟳</span>
        生成中
      </span>
    );
  }
  // 已生成：completed、success、generated、done
  if (status === 'completed' || status === 'success' || status === 'generated' || status === 'done') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-[#f6ffed] text-[#52c41a] border border-[#b7eb8f]">
        已生成
      </span>
    );
  }
  // 其他状态（包括失败）统一显示为待生成状态
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
      待生成
    </span>
  );
}

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
  // status: 'generating' | 'generated' | 'failed' | 'draft' | 'published' | 'review_failed'
  // 统一生成状态：pending/processing/generating（生成中），completed/success/generated/done（已生成），failed/review_failed（生成失败）
  status: 'generating' | 'generated' | 'failed' | 'draft' | 'published' | 'review_failed' | 'pending' | 'processing' | 'completed' | 'success' | 'done';
  push_status: 'pending' | 'success' | 'failed';
  created_at: string;
  updated_at: string;
  generate_progress?: GenerateProgress;
  // 审核相关字段
  review_status?: 'pending' | 'passed' | 'failed';
  review_message?: string;
  // 金句、SEO关键词、互动钩子
  share_quote?: string[];
  seo_keywords?: string[];
  interaction_hook?: string;
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
    // 检查localStorage中是否有正在生成的任务
    const generatingTasks = JSON.parse(localStorage.getItem('generatingTasks') || '[]');
    if (generatingTasks.length > 0) {
      // 清除过期的任务（超过5分钟的视为已失败）
      const now = Date.now();
      const validTasks = generatingTasks.filter((task: any) => {
        const taskAge = now - new Date(task.startedAt).getTime();
        return taskAge < 5 * 60 * 1000; // 5分钟内
      });
      
      if (validTasks.length === 0) {
        // 所有任务都已过期，清除localStorage
        localStorage.removeItem('generatingTasks');
      } else if (validTasks.length < generatingTasks.length) {
        // 部分任务过期，更新localStorage
        localStorage.setItem('generatingTasks', JSON.stringify(validTasks));
      }
    }
    
    // 加载文章列表（会包含数据库中已生成的文章）
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
        // 生成中：pending、processing、generating
        return article.status === 'pending' || article.status === 'processing' || article.status === 'generating';
      case 'generated':
        // 已生成：completed、success、generated
        return article.status === 'completed' || article.status === 'success' || article.status === 'generated';
      case 'draft':
        // 未推送：已生成但未推送的文章
        return (article.status === 'completed' || article.status === 'success' || article.status === 'generated') && article.push_status !== 'success';
      case 'published':
        // 已推送：推送成功的文章
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
    // 验证逻辑：如果没有输入标题，则必须输入主题
    if (!articleTitle && !articleTopic) {
      alert('请输入文章主题或文章标题');
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

    // 保存正在生成的任务到localStorage，用于页面切换后恢复
    const generatingTasks = JSON.parse(localStorage.getItem('generatingTasks') || '[]');
    const taskInfo = {
      tempId: tempArticle.id,
      topic: articleTopic,
      startedAt: new Date().toISOString()
    };
    localStorage.setItem('generatingTasks', JSON.stringify([...generatingTasks, taskInfo]));

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

          // 根据审核结果确定状态
          const reviewStatus = data.review?.status || 'passed';
          const articleStatus = reviewStatus === 'passed' ? 'generated' : 'review_failed';

          // 构建最终的文章对象（从API返回的数据）
          const finalArticle: Article = {
            id: savedArticle?.id || tempArticle.id,
            title: savedArticle?.title || articleTitle || '未命名文章',
            content: savedArticle?.content || '',
            images: savedArticle?.images || [],
            image_urls: savedArticle?.images || [],
            group_id: null,
            group_name: groups.find(g => g.id === selectedGroupId)?.name || savedArticle?.group_name || '默认分组',
            status: articleStatus,
            push_status: 'pending',
            created_at: tempArticle.created_at,
            updated_at: new Date().toISOString(),
            generate_progress: 'done',
            review_status: reviewStatus,
            review_message: data.review?.message || '',
            // 金句、SEO关键词、互动钩子
            share_quote: data.extraction?.shareQuote || [],
            seo_keywords: data.extraction?.seoKeywords || [],
            interaction_hook: data.extraction?.interactionHook || ''
          };

          // 只有提示词违规时才显示失败提示，其他情况后台自动消化
          if (data.error_type === 'prompt_invalid') {
            alert(data.message || '您的提示词包含违规词汇，请修改后重试');
          }
          // 审核不通过时，后台会自动修复，不会返回给前端显示

          // 找到临时文章的位置并替换，并清除localStorage
          setArticles(prevArticles => {
            // 清除localStorage中的任务
            const generatingTasks = JSON.parse(localStorage.getItem('generatingTasks') || '[]');
            const updatedTasks = generatingTasks.filter((t: any) => t.tempId !== tempArticle.id);
            localStorage.setItem('generatingTasks', JSON.stringify(updatedTasks));
            
            const index = prevArticles.findIndex(a => a.id === tempArticle.id);
            if (index !== -1) {
              const newArticles = [...prevArticles];
              newArticles[index] = finalArticle;
              return newArticles;
            }
            // 如果没找到临时文章（页面切换后），直接在开头添加
            return [finalArticle, ...prevArticles];
          });
        } else {
          // 生成失败，更新状态，并清除localStorage
          setArticles(prevArticles => {
            // 清除localStorage中的任务
            const generatingTasks = JSON.parse(localStorage.getItem('generatingTasks') || '[]');
            const updatedTasks = generatingTasks.filter((t: any) => t.tempId !== tempArticle.id);
            localStorage.setItem('generatingTasks', JSON.stringify(updatedTasks));
            
            const index = prevArticles.findIndex(a => a.id === tempArticle.id);
            if (index !== -1) {
              const newArticles = [...prevArticles];
              newArticles[index] = { 
                ...newArticles[index], 
                status: 'failed',
                review_status: data.review?.status || 'failed',
                review_message: data.review?.message || '生成失败，请稍后重试'
              };
              return newArticles;
            }
            return prevArticles;
          });
          alert(data.review?.message || '生成失败，请稍后重试');
        }
      } else {
        // 请求失败，更新状态，并清除localStorage
        setArticles(prevArticles => {
          // 清除localStorage中的任务
          const generatingTasks = JSON.parse(localStorage.getItem('generatingTasks') || '[]');
          const updatedTasks = generatingTasks.filter((t: any) => t.tempId !== tempArticle.id);
          localStorage.setItem('generatingTasks', JSON.stringify(updatedTasks));
          
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

  // 推送到微信草稿箱 - 需审核通过
  const handlePushToWechat = async (article: Article) => {
    // 检查审核状态
    if (article.review_status === 'failed' || article.status === 'review_failed') {
      alert('内容审核未通过，无法推送');
      return;
    }
    if (article.review_status === 'pending') {
      alert('审核服务暂不可用，请稍后重试');
      return;
    }
    if (!article.content) {
      alert('文章内容为空，无法推送');
      return;
    }

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

  // 生成完整文章内容（包含图片在正确位置）- 与 ArticleContentWithImages 完全相同的逻辑
  const generateFullContent = (article: Article): string => {
    const { textContent, images } = processArticleContent(article.content || '', article.images || []);
    
    if (!images || images.length === 0) {
      return textContent;
    }
    
    // 解析文章内容，提取标题和段落（与 ArticleContentWithImages 的 parseContent 完全相同）
    const parseContent = (content: string) => {
      const lines = content.split('\n');
      const sections: { type: 'title' | 'paragraph' | 'separator'; content: string; level?: number }[] = [];
      let currentParagraph = '';
      
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        
        if (!trimmed) {
          if (currentParagraph) {
            currentParagraph += '\n';
          }
          return;
        }
        
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          if (currentParagraph.trim()) {
            sections.push({ type: 'paragraph', content: currentParagraph.trim() });
            currentParagraph = '';
          }
          sections.push({ type: 'separator', content: '' });
          return;
        }
        
        if (trimmed.startsWith('#')) {
          if (currentParagraph.trim()) {
            sections.push({ type: 'paragraph', content: currentParagraph.trim() });
            currentParagraph = '';
          }
          const level = trimmed.match(/^#+/)?.[0].length || 1;
          sections.push({ type: 'title', content: trimmed.replace(/^#+\s*/, ''), level });
        } else {
          currentParagraph += (currentParagraph ? '\n' : '') + trimmed;
        }
      });
      
      if (currentParagraph.trim()) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
      }
      
      return sections;
    };
    
    const sections = parseContent(textContent);
    
    // 插入图片的策略（与 ArticleContentWithImages 的 getImageInsertIndices 完全相同）
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
    
    // 构建包含图片的完整内容
    const result: string[] = [];
    for (let i = 0; i < sections.length; i++) {
      // 在段落前插入图片
      while (imageIdx < imageIndices.length && imageIndices[imageIdx] === i && imageIdx < images.length) {
        result.push(`\n![配图](${images[imageIdx]})\n`);
        imageIdx++;
      }
      
      // 添加当前段落
      if (sections[i].type === 'title') {
        const level = sections[i].level || 1;
        result.push('#'.repeat(level) + ' ' + sections[i].content);
      } else if (sections[i].type === 'separator') {
        result.push('---');
      } else {
        result.push(sections[i].content);
      }
    }
    
    // 如果还有剩余图片，追加到末尾
    while (imageIdx < images.length) {
      result.push(`\n![配图](${images[imageIdx]})\n`);
      imageIdx++;
    }
    
    return result.join('\n\n');
  };

  // 编辑文章 - 跳转到一键排版页面
  const handleEditArticle = (article: Article) => {
    // 生成包含图片的完整内容（与查看时保持一致）
    const fullContent = generateFullContent(article);
    
    // 创建传递给排版页面的文章对象
    const articleForFormat = {
      ...article,
      content: fullContent,
      // 清空 images，因为已经合并到 content 中了
      images: [],
      image_urls: []
    };
    
    const articleData = encodeURIComponent(JSON.stringify(articleForFormat));
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

  const ArticleContentWithImages = ({ article }: { article: Article }) => {
    // 图片样式
    const imageStyle = {
      container: 'rounded-xl shadow-lg overflow-hidden mb-6',
      img: 'w-full h-auto',
    };

    // 标题样式组件
    const TitleWithIcon = ({ title, idx }: { title: string; idx: number }) => (
      <div className="flex items-center gap-3 mb-5 mt-6">
        <span className={`w-7 h-7 ${theme.icon.bg} ${theme.icon.shape} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
          {idx}
        </span>
        <h2 className={`text-lg font-bold ${theme.accent}`}>{title}</h2>
      </div>
    );

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
    
    // 解析文章内容，提取标题和段落，同时处理排版引擎标记
    const parseContent = (content: string) => {
      // 先处理排版引擎的标记（核心金句等）
      let processedContent = content;
      
      // 处理核心金句标记 - 替换为特殊标记
      processedContent = processedContent.replace(/§§KEY_POINT§§([\s\S]*?)§§\/KEY_POINT§§/g, '\n\n[[[KEY_POINT]]]$1[[[/KEY_POINT]]]\n\n');
      
      // 处理引用句标记
      processedContent = processedContent.replace(/§§QUOTE§§([\s\S]*?)§§\/QUOTE§§/g, '\n\n[[[QUOTE]]]$1[[[/QUOTE]]]\n\n');
      
      // 处理分隔符标记
      processedContent = processedContent.replace(/§§SEPARATOR§§/g, '\n\n---SEPARATOR---\n\n');
      
      const lines = processedContent.split('\n');
      const sections: { type: 'title' | 'paragraph' | 'separator' | 'key-point' | 'quote'; content: string; level?: number }[] = [];
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
        if (trimmed === '---' || trimmed === '***' || trimmed === '___' || trimmed === '---SEPARATOR---') {
          if (currentParagraph.trim()) {
            sections.push({ type: 'paragraph', content: currentParagraph.trim() });
            currentParagraph = '';
          }
          sections.push({ type: 'separator', content: '' });
          return;
        }
        
        // 检测核心金句标记
        if (trimmed.includes('[[[KEY_POINT]]]')) {
          if (currentParagraph.trim()) {
            sections.push({ type: 'paragraph', content: currentParagraph.trim() });
            currentParagraph = '';
          }
          const keyContent = trimmed.replace('[[[KEY_POINT]]]', '').replace('[[[/KEY_POINT]]]', '');
          sections.push({ type: 'key-point', content: keyContent });
          return;
        }
        
        // 检测引用句标记
        if (trimmed.includes('[[[QUOTE]]]')) {
          if (currentParagraph.trim()) {
            sections.push({ type: 'paragraph', content: currentParagraph.trim() });
            currentParagraph = '';
          }
          const quoteContent = trimmed.replace('[[[QUOTE]]]', '').replace('[[[/QUOTE]]]', '');
          sections.push({ type: 'quote', content: quoteContent });
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
                className={`w-full ${imageStyle}`} 
              />
            </div>
          );
          imageIdx++;
        }
        
        if (section.type === 'separator') {
          element.push(<hr key={`sep-${idx}`} className="my-6 border-gray-200" />);
        } else if (section.type === 'title') {
          const level = section.level || 1;
          const isMainTitle = level === 1;
          
          if (isMainTitle) {
            // 一级标题：蓝色圆形序号 + 橙色标题
            element.push(
              <TitleWithIcon 
                key={`title-${idx}`} 
                title={section.content} 
                idx={idx}
              />
            );
          } else {
            // 二级标题：简洁样式
            element.push(
              <div key={`title-${idx}`} className="flex items-center gap-2 mt-6 mb-3">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                <h3 className="text-lg font-semibold text-orange-500">
                  {section.content}
                </h3>
              </div>
            );
          }
        } else if (section.type === 'key-point') {
          // 核心金句：上下多空一行，红色左边框
          const processedContent = section.content
            .replace(/\*\*(.*?)\*\*/g, `<strong class="text-red-500">$1</strong>`);
          element.push(
            <div key={`keypoint-${idx}`} className="my-6 pl-4 border-l-4 border-red-400">
              <p className="text-gray-800 text-[15px] leading-7">
                <span dangerouslySetInnerHTML={{ __html: processedContent }} />
              </p>
            </div>
          );
        } else if (section.type === 'quote') {
          // 引用句：灰色左边框，斜体
          const processedContent = section.content
            .replace(/\*\*(.*?)\*\*/g, `<strong class="text-blue-500">$1</strong>`);
          element.push(
            <div key={`quote-${idx}`} className="my-5 pl-4 border-l-2 border-gray-300 italic text-gray-600 text-[15px] leading-7">
              <span dangerouslySetInnerHTML={{ __html: processedContent }} />
            </div>
          );
        } else if (section.type === 'paragraph') {
          // 处理段落中的强调文字
          const processedContent = section.content
            .replace(/\*\*(.*?)\*\*/g, `<strong class="text-red-500">$1</strong>`)
            .replace(/__(.*?)__/g, `<strong class="text-red-500 underline decoration-blue-400">$1</strong>`);
          
          element.push(
            <p key={`para-${idx}`} className="text-gray-700 text-[15px] leading-7 text-left mb-5">
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
            className={`w-full ${imageStyle}`} 
          />
        </div>
      ))}
    </div>
  );
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
                <div className="flex items-center gap-2" data-filter-buttons>
                  <span className="text-sm text-gray-500">筛选:</span>
                  <div className="flex gap-1" data-filter-buttons>
                    {[
                      { key: 'all', label: '全部' },
                      { key: 'generating', label: '生成中' },
                      { key: 'generated', label: '已生成' },
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
                        onClick={() => {
                          console.log('点击筛选按钮:', filter.key);
                          setSelectedFilter(filter.key);
                        }}
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
                <div className="bg-gray-50 border-b px-4 py-3 grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-600 text-center">
                  <div className="col-span-1 flex justify-center">选择</div>
                  <div className="col-span-1 flex justify-center">封面</div>
                  <div className="col-span-2 flex justify-center">文章标题</div>
                  <div className="col-span-1 flex justify-center">分组</div>
                  <div className="col-span-1 flex justify-center">生成状态</div>
                  <div className="col-span-1 flex justify-center">推送状态</div>
                  <div className="col-span-2 flex justify-center">更新时间</div>
                  <div className="col-span-3 flex justify-center" style={{ textAlign: 'center', minWidth: '200px' }}>操作</div>
                </div>
                {/* 表格内容 */}
                {filteredArticles.map(article => (
                  <div 
                    key={article.id} 
                    className="border-b last:border-b-0 px-4 py-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-gray-50"
                  >
                    {/* 选择 */}
                    <div className="col-span-1 flex justify-center">
                      <Checkbox checked={false} onCheckedChange={() => {}} />
                    </div>
                    {/* 封面 */}
                    <div className="col-span-1 flex justify-center">
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
                    <div className="col-span-2 flex justify-center">
                      <p className="font-medium text-gray-900 truncate">{article.title}</p>
                    </div>
                    {/* 分组 */}
                    <div className="col-span-1 flex justify-center">
                      <span className="text-gray-600 text-xs">
                        {article.group_name || '-'}
                      </span>
                    </div>
                    {/* 生成状态 */}
                    <div className="col-span-1 flex justify-center">
                      <StatusBadge status={article.status} />
                    </div>
                    {/* 推送状态 */}
                    <div className="col-span-1 flex justify-center items-center">
                      <span 
                        className={`w-2 h-2 rounded-full ${
                          article.push_status === 'success' ? 'bg-[#52c41a]' : 'bg-[#d9d9d9]'
                        }`}
                        title={article.push_status === 'success' ? '已推送' : '未推送'}
                      />
                    </div>
                    {/* 更新时间 */}
                    <div className="col-span-2 flex justify-center">
                      <span className="text-gray-500 text-xs">
                        {new Date(article.updated_at).toLocaleDateString()} {new Date(article.updated_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {/* 操作 */}
                    <div className="col-span-3 flex items-center justify-center gap-2" style={{ minWidth: '200px' }}>
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
                      
                      {/* 推送 - 仅已生成且未推送才可推送 */}
                      <button
                        onClick={() => {
                          // 只有已生成（completed）的文章才能推送
                          const isGenerated = article.status === 'completed' || article.status === 'success' || article.status === 'generated' || article.status === 'done';
                          const isPushed = article.push_status === 'success';
                          
                          if (!isGenerated) {
                            alert('文章尚未生成完成，无法推送');
                            return;
                          }
                          if (isPushed) {
                            return;
                          }
                          handlePushToWechat(article);
                        }}
                        disabled={article.push_status === 'success'}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                          article.push_status === 'success'
                            ? 'text-gray-300 cursor-not-allowed'
                            : (article.status === 'completed' || article.status === 'success' || article.status === 'generated' || article.status === 'done')
                              ? 'hover:bg-gray-100 text-gray-700'
                              : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <Send className="h-4 w-4" />
                        <span className="text-xs">{article.push_status === 'success' ? '已推送' : '推送'}</span>
                      </button>
                      
                      {/* 删除 */}
                      <button 
                        onClick={() => handleDeleteArticle(String(article.id))}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        data-action="delete"
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
            {/* 文章标题 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="h-4 w-4 text-yellow-500" />
                  文章标题
                </Label>
                <span className="text-xs text-gray-500">（选填，不填则根据主题自动生成）</span>
              </div>
              <Input
                placeholder="输入你想创作的文章标题"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
              />
            </div>

            {/* 文章主题 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  文章主题
                </Label>
                <span className="text-xs text-gray-500">（{articleTitle ? '选填' : '必填'}，用于生成{articleTitle ? '文章内容' : '标题和内容'}）</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">{articleTitle ? '输入你想创作的文章主题，系统将围绕主题生成内容' : '输入你想创作的文章主题，AI将生成匹配的标题'}</p>
              <Input
                placeholder={articleTitle ? "输入文章主题（选填）" : "输入你想创作的文章主题"}
                value={articleTopic}
                onChange={(e) => setArticleTopic(e.target.value)}
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
              {viewingArticle && <StatusBadge status={viewingArticle!.status} />}
            </DialogTitle>
            {viewingArticle?.group_name && (
              <p className="text-sm text-gray-500 mt-1">
                <FolderOpen className="h-3 w-3 inline mr-1" />
                {viewingArticle?.group_name}
              </p>
            )}
          </DialogHeader>
          
          {viewingArticle && (
            <div className="space-y-4">
              {/* 生成失败/审核未通过提示 */}
              {(viewingArticle!.status === 'failed' || viewingArticle!.status === 'review_failed') && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  <p className="font-medium flex items-center">
                    <span className="mr-2">⚠️</span>
                    内容审核不通过
                  </p>
                  <p className="text-sm mt-1">
                    {viewingArticle?.review_message || viewingArticle?.review_status === 'failed' 
                      ? `文章包含违规内容：${viewingArticle?.review_message || '请修改提示词或选题后重新生成'}`
                      : '生成失败，请修改提示词或选题后重新生成'}
                  </p>
                </div>
              )}

              {/* 文章内容（精美排版）- 仅已生成才显示 */}
              <div className="bg-gray-50 rounded-lg p-6">
                {viewingArticle?.status === 'completed' || viewingArticle?.status === 'success' || viewingArticle?.status === 'generated' ? (
                  <ArticleContentWithImages article={viewingArticle!} />
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-300" />
                    <p>文章生成中，请稍候...</p>
                  </div>
                )}
              </div>

              {/* 金句展示 */}
              {!!viewingArticle?.share_quote?.length && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-amber-700">社交分享金句</span>
                    <Badge variant="secondary" className="text-xs">点击复制</Badge>
                  </div>
                  <div className="space-y-2">
                    {viewingArticle?.share_quote!.map((quote, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          navigator.clipboard.writeText(quote);
                          alert('金句已复制到剪贴板');
                        }}
                        className="w-full text-left p-3 bg-white rounded-lg hover:bg-amber-50 transition-colors border border-amber-100 text-gray-700 italic"
                      >
                        "{quote}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO关键词展示 */}
              {!!viewingArticle?.seo_keywords?.length && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700">SEO关键词</span>
                    <Badge variant="secondary" className="text-xs">已埋点2-3%密度</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {viewingArticle?.seo_keywords!.map((keyword, idx) => (
                      <Badge 
                        key={idx} 
                        className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(keyword);
                          alert('关键词已复制');
                        }}
                      >
                        #{keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 互动钩子展示 */}
              {viewingArticle?.interaction_hook && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-700">文末互动钩子</span>
                    <Badge variant="secondary" className="text-xs">引导评论</Badge>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewingArticle!.interaction_hook || '');
                      alert('互动钩子已复制');
                    }}
                    className="w-full text-left p-3 bg-white rounded-lg hover:bg-purple-50 transition-colors border border-purple-100"
                  >
                    <p className="text-gray-700 font-medium">
                      {viewingArticle!.interaction_hook}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">点击复制到文章结尾</p>
                  </button>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4 border-t">
                {/* 推送按钮 - 仅已生成且未推送才可推送 */}
                {(viewingArticle?.status === 'completed' || viewingArticle?.status === 'success' || viewingArticle?.status === 'generated') && (
                  <>
                    {viewingArticle?.push_status === 'success' ? (
                      <Button className="flex-1" disabled>
                        <Check className="h-4 w-4 mr-2" />
                        已推送到公众号
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        onClick={() => {
                          if (viewingArticle) {
                            handlePushToWechat(viewingArticle);
                            setViewingArticle(null);
                          }
                        }}
                      >
                        <SendHorizontal className="h-4 w-4 mr-2" />
                        推送到公众号草稿箱
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
