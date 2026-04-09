'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  Eye,
  ThumbsUp,
  Share2,
  Calendar,
  User,
  ArrowUp,
  ArrowDown,
  Wand2,
  Copy,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2
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

export default function DailyHotPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'reads' | 'likes' | 'shares'>('reads');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedDate, setSelectedDate] = useState<string>('');

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

      const response = await fetch(`/api/hot-articles?${params.toString()}`);

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

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 触发每日自动更新
      const response = await fetch('/api/daily-auto-update', {
        method: 'POST',
      });
      const result = await response.json();
      console.log('自动更新结果:', result);

      // 更新完成后重新获取数据
      await fetchHotArticles();
    } catch (err) {
      console.error('刷新数据失败:', err);
      setError('刷新失败，请稍后重试');
      setIsLoading(false);
    }
  }, [fetchHotArticles]);

  // 页面加载时获取数据
  useEffect(() => {
    fetchHotArticles();
  }, [fetchHotArticles]);

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
          <h1 className="mb-2 text-3xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="mr-3 h-8 w-8 text-orange-500" />
            每日爆款
          </h1>
          <p className="text-gray-600">实时更新低粉爆款，对标写作手法，快速创作出爆款文章</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              刷新中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              刷新数据
            </>
          )}
        </Button>
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

      {/* 数据来源提示 */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Search className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">数据说明</p>
              <p>爆款文章数据来自微信等平台，显示最近30天内的热门内容。点击&ldquo;刷新数据&rdquo;可手动触发更新。</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <Card key={article.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
              <CardContent className="p-3">
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
                        className="mb-1 text-lg font-semibold text-gray-900 hover:text-orange-600 cursor-pointer transition-colors line-clamp-1"
                      >
                        {article.title}
                      </a>
                    ) : (
                      <h3 className="mb-1 text-lg font-semibold text-gray-900 line-clamp-1">
                        {article.title}
                      </h3>
                    )}

                    {/* Meta Info */}
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="mr-1 h-4 w-4" />
                        <span className="truncate max-w-24">{article.account}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
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
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center text-sm">
                        <Eye className="mr-1 h-4 w-4 text-blue-500" />
                        <span className="font-medium">{formatNumber(article.reads)}</span>
                        <span className="ml-1 text-gray-500">阅读</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <ThumbsUp className="mr-1 h-4 w-4 text-red-500" />
                        <span className="font-medium">{formatNumber(article.likes)}</span>
                        <span className="ml-1 text-gray-500">点赞</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Share2 className="mr-1 h-4 w-4 text-green-500" />
                        <span className="font-medium">{formatNumber(article.shares)}</span>
                        <span className="ml-1 text-gray-500">分享</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <Link href={`/smart-writing?title=${encodeURIComponent(article.title)}`}>
                      <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                        <Wand2 className="mr-2 h-4 w-4" />
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
