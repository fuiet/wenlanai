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
      const response = await fetch('/api/articles');
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
      const response = await fetch('/api/article-groups');
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
      const response = await fetch('/api/prompt-templates');
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
        method: 'DELETE'
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
    
    // 立即添加到列表开头，显示"生成中"状态
    setArticles([tempArticle, ...articles]);

    // 更新生成进度
    const updateProgress = (progress: GenerateProgress, updates: Partial<Article>) => {
      setArticles(articles => articles.map(a => 
        a.id === tempArticle.id ? { ...a, ...updates, generate_progress: progress } : a
      ));
    };

    // 后台异步生成文章
    try {
      // 开始生成文章
      const tempId = `temp-${Date.now()}`;
      const tempArticle: Article = {
        id: tempId,
        title: articleTitle || '文章创作中',
        content: '',
        images: [],
        group_id: selectedGroupId,
        group_name: groups.find(g => g.id === selectedGroupId)?.name || '',
        status: 'generating',
        push_status: 'pending',
        generate_progress: 'title',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setArticles(prev => [...prev, tempArticle]);

      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          
          // 更新为已完成
          updateProgress('done', { 
            title: savedArticle?.title || '未命名文章', 
            content: savedArticle?.content || '',
            status: 'generated'
          });
          
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
          
          // 替换临时文章为真实文章
          setArticles(articles => articles.map(a => a.id === tempArticle.id ? finalArticle : a));
        } else {
          // 生成失败，更新状态
          updateProgress('failed', { status: 'failed' });
          alert('生成失败，请稍后重试');
        }
      } else {
        // 请求失败，更新状态
        setArticles(articles.map(a => a.id === tempArticle.id ? { ...a, status: 'failed' } : a));
        const errorText = await response.text();
        console.error('生成失败:', errorText);
        alert('生成失败，请稍后重试');
      }
    } catch (error) {
      console.error('生成失败:', error);
      // 请求失败，更新状态
      setArticles(articles.map(a => a.id === tempArticle.id ? { ...a, status: 'failed' } : a));
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
        method: 'DELETE'
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

  // 渲染文章内容组件（图片间隔插入）
  const ArticleContentWithImages = ({ article }: { article: Article }) => {
    const { textContent, images } = processArticleContent(article.content || '', article.images || []);
    
    // 如果没有图片，直接显示文本
    if (!images || images.length === 0) {
      return <div className="whitespace-pre-wrap text-gray-700">{textContent}</div>;
    }

    // 将文本按段落分割
    const paragraphs = textContent.split(/\n\n+/).filter(p => p.trim());
    
    // 计算每个段落后应该插入图片的位置
    // 策略：在段落之间均匀分布图片
    const result: React.ReactNode[] = [];
    const imagesPerParagraph = Math.ceil(images.length / paragraphs.length);
    
    paragraphs.forEach((paragraph, pIdx) => {
      result.push(
        <p key={`text-${pIdx}`} className="mb-4 text-gray-700">
          {paragraph}
        </p>
      );
      
      // 在段落之间插入图片
      const startImgIdx = pIdx * imagesPerParagraph;
      const endImgIdx = Math.min(startImgIdx + imagesPerParagraph, images.length);
      
      for (let imgIdx = startImgIdx; imgIdx < endImgIdx; imgIdx++) {
        result.push(
          <div key={`img-${imgIdx}`} className="my-4">
            <img 
              src={images[imgIdx]} 
              alt={`配图${imgIdx + 1}`} 
              className="w-full max-w-lg mx-auto rounded-lg" 
            />
          </div>
        );
      }
    });

    return <>{result}</>;
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
                <h1 className="text-2xl font-bold text-gray-900">智能创作</h1>
                <p className="text-sm text-gray-500">AI 驱动的内容创作</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)}
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
                onClick={() => setShowGroupDialog(true)}
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
                      onClick={() => handleDeleteGroup(group.id)}
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
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
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

          <Button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
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
              <p className="text-xs text-gray-500 mb-2">输入你想创作的文章主题</p>
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
              <span>{viewingArticle?.title}</span>
              {viewingArticle && getStatusBadge(viewingArticle)}
            </DialogTitle>
          </DialogHeader>
          
          {viewingArticle && (
            <div className="space-y-4">
              {/* 文章内容（图片间隔插入） */}
              <div className="prose prose-sm max-w-none">
                <ArticleContentWithImages article={viewingArticle} />
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
