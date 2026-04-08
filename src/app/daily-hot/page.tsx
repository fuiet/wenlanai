'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Wand2,
  Copy,
  Search,
  Filter
} from 'lucide-react';

// 模拟数据
const mockArticles = [
  {
    id: 1,
    date: '2025-01-15',
    account: '情感生活馆',
    title: '为什么你总是遇不到对的人？这3个真相扎心了',
    reads: 125800,
    likes: 4560,
    shares: 2340,
    category: '情感',
  },
  {
    id: 2,
    date: '2025-01-15',
    account: '职场加油站',
    title: '30岁后，我终于明白的道理：这5件事决定你的一生',
    reads: 98600,
    likes: 3780,
    shares: 1890,
    category: '职场',
  },
  {
    id: 3,
    date: '2025-01-14',
    account: '星座说',
    title: '2025年1月这3个星座将迎来桃花运，脱单有望！',
    reads: 156700,
    likes: 6890,
    shares: 3450,
    category: '星座',
  },
  {
    id: 4,
    date: '2025-01-14',
    account: '汽车测评',
    title: '10万以内最值得买的3款国产车，性价比超高',
    reads: 87500,
    likes: 2340,
    shares: 1230,
    category: '汽车',
  },
  {
    id: 5,
    date: '2025-01-13',
    account: '民生关注',
    title: '社保新规来了！2025年起，这5类人养老金会涨',
    reads: 234500,
    likes: 12340,
    shares: 8760,
    category: '民生',
  },
  {
    id: 6,
    date: '2025-01-13',
    account: '个人成长',
    title: '坚持3年早起读书，我的人生发生了什么改变？',
    reads: 67800,
    likes: 1890,
    shares: 780,
    category: '成长',
  },
  {
    id: 7,
    date: '2025-01-12',
    account: '娱乐八卦',
    title: '这位40岁女星又火了！结婚10年零绯闻，活成了女王',
    reads: 198000,
    likes: 8760,
    shares: 5430,
    category: '娱乐',
  },
  {
    id: 8,
    date: '2025-01-12',
    account: '财经理财',
    title: '普通人如何靠理财实现财务自由？这3个方法很实用',
    reads: 145600,
    likes: 5430,
    shares: 3210,
    category: '财经',
  },
];

export default function DailyHotPage() {
  const [sortBy, setSortBy] = useState<'reads' | 'likes' | 'shares'>('reads');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  const categories = ['全部', '情感', '职场', '星座', '汽车', '民生', '成长', '娱乐', '财经'];

  // 过滤和排序文章
  const filteredArticles = mockArticles
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 flex items-center">
          <TrendingUp className="mr-3 h-8 w-8 text-orange-500" />
          每日爆款
        </h1>
        <p className="text-gray-600">实时更新低粉爆款，对标写作手法，快速创作出爆款文章</p>
      </div>

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
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">分类筛选：</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sort Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">全部文章</TabsTrigger>
          <TabsTrigger value="today">今日爆款</TabsTrigger>
          <TabsTrigger value="week">本周爆款</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="space-y-4">
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
            {filteredArticles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  没有找到匹配的文章
                </CardContent>
              </Card>
            ) : (
              filteredArticles.map((article, index) => (
                <Card key={article.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Index Badge */}
                        <Badge className="mb-3 bg-gradient-to-r from-orange-500 to-purple-500">
                          #{index + 1}
                        </Badge>
                        
                        {/* Title */}
                        <h3 className="mb-2 text-xl font-semibold text-gray-900 hover:text-orange-600 cursor-pointer transition-colors">
                          {article.title}
                        </h3>
                        
                        {/* Meta Info */}
                        <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <User className="mr-1 h-4 w-4" />
                            {article.account}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="mr-1 h-4 w-4" />
                            {article.date}
                          </div>
                          <Badge variant="secondary">{article.category}</Badge>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex flex-wrap gap-4">
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
                        <Link href="/smart-writing">
                          <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                            <Wand2 className="mr-2 h-4 w-4" />
                            提示词打造
                          </Button>
                        </Link>
                        <Link href="/smart-writing">
                          <Button size="sm" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                            <Copy className="mr-2 h-4 w-4" />
                            二创
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
