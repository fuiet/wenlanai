'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp,
  Eye,
  ThumbsUp,
  Share2,
  Calendar,
  User,
  ArrowUp,
  ArrowDown,
  Copy,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Sparkles,
  Database,
  Globe,
  BarChart3
} from 'lucide-react';


interface Article {
  id: string | number;
  publish_date: string;
  account: string;
  title: string;
  reads: number;
  likes: number;
  shares: number;
  category: string;
  source?: string;
  snippet?: string;
  url?: string; // 文章链接
}

const categories = [
  '全部', '情感', '职场', '娱乐', '财经', '科技',
  '汽车', '房产', '美食', '健康', '教育',
  '母婴', '旅游', '时尚', '美妆', '数码',
  '游戏', '动漫', '体育', '三农', '军事',
  '国际', '历史', '文化', '法律', '宗教',
  '星座', '命理', '风水', '玄学', '占卜',
  '职场管理', '创业', '商业', '营销', '品牌',
  '媒体', '出版', '写作', '文案', '设计',
];

// 数据源配置 - 按类别分组
const dataSources = [
  // 微信生态
  { id: 'weixin', name: '微信搜一搜', icon: Globe, description: '微信公众号热文', category: '微信生态', enabled: true },
  // 社交媒体
  { id: 'weibo', name: '微博热搜', icon: Globe, description: '微博实时热搜', category: '社交媒体', enabled: true },
  { id: 'toutiao', name: '今日头条', icon: Globe, description: '头条热榜', category: '社交媒体', enabled: true },
  { id: 'zhihu', name: '知乎', icon: Globe, description: '知乎热问', category: '社交媒体', enabled: false },
  // 数据平台
  { id: 'newrank', name: '新榜', icon: Globe, description: '新榜热文榜单', category: '数据平台', enabled: true },
  // 字节系
  { id: 'xigua', name: '西瓜创作', icon: Globe, description: '西瓜图文热文', category: '字节系', enabled: true },
  // 百度系
  { id: 'baijiahao', name: '百度百家号', icon: Globe, description: '百家号热门文章', category: '百度系', enabled: true },
  // 科技媒体
  { id: '36kr', name: '36氪', icon: Globe, description: '科技创业资讯', category: '科技媒体', enabled: false },
  { id: 'huxiu', name: '虎嗅', icon: Globe, description: '商业科技资讯', category: '科技媒体', enabled: false },
];

export default function DailyHotPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'reads' | 'likes' | 'shares'>('reads');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['weixin', 'weibo', 'newrank', 'xigua', 'baijiahao']);
  const [activeTab, setActiveTab] = useState('hot');
  const [dataStats, setDataStats] = useState<{ total: number; sources: { [key: string]: number } }>({ total: 0, sources: {} });

  // 获取爆款文章数据
  const fetchHotArticles = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== '全部') {
        params.append('category', selectedCategory);
      }
      if (selectedDate) {
        params.append('publish_date', selectedDate);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/hot-articles?${params.toString()}`, { credentials: 'include' });

      const data = await response.json();

      if (data.success && data.data) {
        setArticles(data.data);
      } else {
        // 如果获取失败，显示错误提示
        setArticles([]);
        setError('暂无爆款文章数据，请等待每日自动更新或手动刷新数据');
      }
    } catch (err) {
      console.error('获取爆款文章失败:', err);
      setError('网络错误，无法加载数据');
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedDate]);

  // 手动刷新 - 从专业数据源获取
  const handleRefresh = useCallback(async () => {
    // 检查登录状态
    const stored = localStorage.getItem('user');
    if (!stored) {
      alert('请先登录');
      return;
    }
    
    setIsRefreshing(true);
    setError('');
    try {
      // 使用专业数据源获取API
      const response = await fetch('/api/fetch-pro-hot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: selectedCategory !== '全部' ? selectedCategory : undefined,
          sources: selectedSources
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        setDataStats({
          total: result.articleCount,
          sources: result.sourceStats || {}
        });
        setArticles(result.articles || []);
      } else {
        setError(result.error || '获取数据失败');
      }
    } catch (err) {
      console.error('刷新数据失败:', err);
      setError('刷新失败，请稍后重试');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [selectedCategory, selectedSources]);

  // 切换数据源
  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev => {
      if (prev.includes(sourceId)) {
        // 如果已选中，至少保留一个
        if (prev.length > 1) {
          return prev.filter(id => id !== sourceId);
        }
        return prev;
      }
      return [...prev, sourceId];
    });
  };

  // 从数据库获取已有数据
  const fetchFromDatabase = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== '全部') {
        params.append('category', selectedCategory);
      }
      if (selectedDate) {
        params.append('publish_date', selectedDate);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/hot-articles?${params.toString()}`, { credentials: 'include' });

      const data = await response.json();

      if (data.success && data.data) {
        setArticles(data.data);
        setDataStats({ total: data.data.length, sources: {} });
      } else {
        setArticles([]);
        setError('暂无爆款文章数据，请点击&quot;获取实时数据&quot;刷新');
      }
    } catch (err) {
      console.error('获取爆款文章失败:', err);
      setError('网络错误，无法加载数据');
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedDate]);

  // Tab切换处理
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'hot') {
      fetchFromDatabase();
    } else if (tab === 'realtime') {
      handleRefresh();
    }
  };

  // 页面加载时获取数据库已有数据
  useEffect(() => {
    fetchFromDatabase();
  }, [fetchFromDatabase]);

  // 过滤和排序文章
  const filteredArticles = articles
    .filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           article.account.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '全部' || article.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const handleSort = (field: 'reads' | 'likes' | 'shares') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="mr-3 h-8 w-8 text-orange-500" />
            每日爆款
          </h1>
          <p className="text-sm text-gray-500">实时更新低粉爆款，对标写作手法，快速创作出爆款文章</p>
        </div>
        <div className="flex items-center gap-3">
          {dataStats.total > 0 && (
            <Badge variant="outline" className="text-sm">
              <Database className="mr-1 h-4 w-4" />
              数据库: {dataStats.total} 篇
            </Badge>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs - 数据源选择 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="hot" className="gap-2">
              <Database className="h-4 w-4" />
              数据库文章
            </TabsTrigger>
            <TabsTrigger value="realtime" className="gap-2">
              <Globe className="h-4 w-4" />
              获取实时数据
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="hot" className="mt-0">
        </TabsContent>

        <TabsContent value="realtime" className="mt-0">
          {/* 实时数据获取 */}
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="py-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <p className="font-semibold mb-1">实时数据获取</p>
                    <p>从多个真实数据源获取最新爆款文章。勾选数据源后点击&quot;获取实时数据&quot;按钮。</p>
                  </div>
                </div>

                {/* 数据源选择 */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">选择数据源（可多选）：</Label>
                  <div className="space-y-3">
                    {/* 微信生态 */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">微信生态</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {dataSources.filter(s => s.category === '微信生态').map((source) => {
                          const Icon = source.icon;
                          const isSelected = selectedSources.includes(source.id);
                          return (
                            <div
                              key={source.id}
                              onClick={() => toggleSource(source.id)}
                              className={`
                                flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                                ${isSelected 
                                  ? 'border-green-500 bg-green-50 text-green-700' 
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}
                              `}
                            >
                              <Checkbox 
                                checked={isSelected} 
                                onCheckedChange={() => toggleSource(source.id)}
                                className="pointer-events-none h-4 w-4"
                              />
                              <Icon className="h-4 w-4 pointer-events-none" />
                              <span className="pointer-events-none truncate">{source.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 社交媒体 */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">社交媒体</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {dataSources.filter(s => s.category === '社交媒体').map((source) => {
                          const Icon = source.icon;
                          const isSelected = selectedSources.includes(source.id);
                          return (
                            <div
                              key={source.id}
                              onClick={() => toggleSource(source.id)}
                              className={`
                                flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                                ${isSelected 
                                  ? 'border-green-500 bg-green-50 text-green-700' 
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}
                              `}
                            >
                              <Checkbox 
                                checked={isSelected} 
                                onCheckedChange={() => toggleSource(source.id)}
                                className="pointer-events-none h-4 w-4"
                              />
                              <Icon className="h-4 w-4 pointer-events-none" />
                              <span className="pointer-events-none truncate">{source.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 内容平台 */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">内容平台</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {dataSources.filter(s => s.category === '数据平台' || s.category === '字节系' || s.category === '百度系').map((source) => {
                          const Icon = source.icon;
                          const isSelected = selectedSources.includes(source.id);
                          return (
                            <div
                              key={source.id}
                              onClick={() => toggleSource(source.id)}
                              className={`
                                flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                                ${isSelected 
                                  ? 'border-green-500 bg-green-50 text-green-700' 
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}
                              `}
                            >
                              <Checkbox 
                                checked={isSelected} 
                                onCheckedChange={() => toggleSource(source.id)}
                                className="pointer-events-none h-4 w-4"
                              />
                              <Icon className="h-4 w-4 pointer-events-none" />
                              <span className="pointer-events-none truncate">{source.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 科技媒体 */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">科技媒体</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {dataSources.filter(s => s.category === '科技媒体').map((source) => {
                          const Icon = source.icon;
                          const isSelected = selectedSources.includes(source.id);
                          return (
                            <div
                              key={source.id}
                              onClick={() => toggleSource(source.id)}
                              className={`
                                flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                                ${isSelected 
                                  ? 'border-green-500 bg-green-50 text-green-700' 
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}
                              `}
                            >
                              <Checkbox 
                                checked={isSelected} 
                                onCheckedChange={() => toggleSource(source.id)}
                                className="pointer-events-none h-4 w-4"
                              />
                              <Icon className="h-4 w-4 pointer-events-none" />
                              <span className="pointer-events-none truncate">{source.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 获取按钮 */}
                <div className="flex items-center justify-end">
                  <Button
                    onClick={() => {
                      handleRefresh();
                    }}
                    disabled={isRefreshing || selectedSources.length === 0}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {isRefreshing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        获取中...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        获取实时数据 ({selectedSources.length}个数据源)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索文章标题或账号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchHotArticles();
              }}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDate('');
                fetchHotArticles();
              }}
            >
              清除日期
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">分类筛选：</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedCategory(category);
                  fetchHotArticles();
                }}
                disabled={isLoading}
                className={selectedCategory === category ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort Buttons */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">排序：</span>
        <Button
          variant={sortBy === 'reads' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSort('reads')}
          className={sortBy === 'reads' ? 'bg-orange-500 hover:bg-orange-600' : ''}
        >
          阅读量
          {sortBy === 'reads' && (
            sortOrder === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
          )}
        </Button>
        <Button
          variant={sortBy === 'likes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSort('likes')}
          className={sortBy === 'likes' ? 'bg-orange-500 hover:bg-orange-600' : ''}
        >
          点赞数
          {sortBy === 'likes' && (
            sortOrder === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
          )}
        </Button>
        <Button
          variant={sortBy === 'shares' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSort('shares')}
          className={sortBy === 'shares' ? 'bg-orange-500 hover:bg-orange-600' : ''}
        >
          分享数
          {sortBy === 'shares' && (
            sortOrder === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUp className="ml-1 h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Articles List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <p>正在获取最新爆款文章...</p>
          </CardContent>
        </Card>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Search className="mx-auto mb-4 h-16 w-16 opacity-20" />
            <p>没有找到匹配的文章</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article, index) => (
            <Card key={`${article.id || article.title}-${index}`} className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500 py-2">
              <CardContent className="p-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Index Badge */}
                    <Badge className="mb-2 bg-gradient-to-r from-orange-500 to-purple-500 text-xs">
                      #{index + 1}
                    </Badge>

                    {/* Title */}
                    {article.url ? (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-1 text-base font-medium text-gray-900 hover:text-orange-600 cursor-pointer transition-colors line-clamp-1"
                      >
                        {article.title}
                      </a>
                    ) : (
                      <h3 className="mb-1 text-base font-medium text-gray-900 line-clamp-1">
                        {article.title}
                      </h3>
                    )}

                    {/* Meta Info */}
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                      <div className="flex items-center">
                        <User className="mr-0.5 h-3 w-3" />
                        <span className="truncate max-w-20">{article.account}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-0.5 h-3 w-3" />
                        {article.publish_date}
                      </div>
                      <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                    </div>

                    {/* Snippet (if available) */}
                    {article.snippet && (
                      <p className="mb-1 text-sm text-gray-600 line-clamp-1">
                        {article.snippet}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center text-xs">
                        <Eye className="mr-0.5 h-3 w-3 text-blue-500" />
                        <span className="font-medium">{formatNumber(article.reads)}</span>
                        <span className="ml-0.5 text-gray-500">阅读</span>
                      </div>
                      <div className="flex items-center text-xs">
                        <ThumbsUp className="mr-0.5 h-3 w-3 text-red-500" />
                        <span className="font-medium">{formatNumber(article.likes)}</span>
                        <span className="ml-0.5 text-gray-500">点赞</span>
                      </div>
                      <div className="flex items-center text-xs">
                        <Share2 className="mr-0.5 h-3 w-3 text-green-500" />
                        <span className="font-medium">{formatNumber(article.shares)}</span>
                        <span className="ml-0.5 text-gray-500">分享</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <Link href={`/prompt-crafting?title=${encodeURIComponent(article.title)}`}>
                      <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                        <Sparkles className="mr-2 h-4 w-4" />
                        提示词打造
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => copyToClipboard(article.title)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      复制标题
                    </Button>
                    <Link href={`/smart-writing?title=${encodeURIComponent(article.title)}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        二创
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
