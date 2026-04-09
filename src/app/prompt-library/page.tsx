'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  BookOpen,
  Plus,
  Search,
  Wand2,
  Copy,
  Edit,
  Trash2,
  TrendingUp,
  Sparkles,
  Filter
} from 'lucide-react';

// 模拟提示词数据
interface Prompt {
  id: number;
  name: string;
  category: string;
  description: string;
  prompt: string;
  tags: string[];
  isCustom: boolean;
}

const mockPrompts: Prompt[] = [
  {
    id: 1,
    name: '情感类爆款文案',
    category: '情感',
    description: '擅长写触动人心的情感类文章，引发共鸣',
    prompt: '你是一位情感类自媒体写作专家，擅长创作触动人心、引发共鸣的爆款文章。你的写作风格温暖细腻，善于通过生活细节和真实情感打动读者。请根据提供的主题，创作一篇具有强烈感染力的情感类文章，要求：1. 开头吸引人 2. 内容有共鸣 3. 结尾有升华',
    tags: ['情感', '爆款', '共鸣'],
    isCustom: false,
  },
  {
    id: 2,
    name: '职场成长导师',
    category: '职场',
    description: '职场经验分享，帮助职场人成长',
    prompt: '你是一位资深职场导师，拥有10年以上HR和职场管理经验。你擅长分享实用的职场干货和成长建议，帮助职场人解决工作难题。请根据提供的主题，创作一篇有深度、有价值的职场类文章，要求：1. 案例真实 2. 方法实用 3. 建议可操作',
    tags: ['职场', '干货', '成长'],
    isCustom: false,
  },
  {
    id: 3,
    name: '星座运势分析师',
    category: '星座',
    description: '专业的星座分析和运势预测',
    prompt: '你是一位专业的星座分析师，精通十二星座的性格特点和运势规律。你的分析准确、有趣，深受粉丝喜爱。请根据提供的星座和时间，进行详细的星座分析，包括：性格特点、近期运势、注意事项、建议等',
    tags: ['星座', '运势', '分析'],
    isCustom: false,
  },
  {
    id: 4,
    name: '汽车评测专家',
    category: '汽车',
    description: '专业的汽车评测和购车建议',
    prompt: '你是一位资深的汽车评测专家，拥有丰富的汽车行业经验。你擅长从消费者角度出发，提供客观、实用的汽车评测和购车建议。请根据提供的车型或需求，创作一篇专业的汽车类文章，要求：1. 数据准确 2. 分析客观 3. 建议实用',
    tags: ['汽车', '评测', '购车'],
    isCustom: false,
  },
  {
    id: 5,
    name: '我的个人风格',
    category: '自定义',
    description: '自定义的写作风格',
    prompt: '你是一位自媒体写作专家，擅长创作轻松、有趣、实用的内容。你的风格幽默风趣，善于用生动的比喻和案例。请根据主题创作内容。',
    tags: ['自定义', '幽默', '实用'],
    isCustom: true,
  },
];

const categories = ['全部', '情感', '职场', '星座', '汽车', '民生', '成长', '娱乐', '财经', '自定义'];

export default function PromptLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>(mockPrompts);
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    category: '自定义',
    description: '',
    prompt: '',
    tags: '',
  });

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '全部' || prompt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreatePrompt = () => {
    if (!newPrompt.name || !newPrompt.prompt) {
      alert('请填写提示词名称和内容');
      return;
    }

    const newPromptWithId = {
      id: Date.now(),
      ...newPrompt,
      tags: newPrompt.tags.split(',').map(t => t.trim()).filter(t => t),
      isCustom: true,
    };

    setPrompts([...prompts, newPromptWithId]);
    setIsCreateDialogOpen(false);
    setNewPrompt({ name: '', category: '自定义', description: '', prompt: '', tags: '' });
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setNewPrompt({
      name: prompt.name,
      category: prompt.category,
      description: prompt.description,
      prompt: prompt.prompt,
      tags: prompt.tags.join(', '),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePrompt = () => {
    if (!editingPrompt) return;

    const updatedPrompts = prompts.map(p =>
      p.id === editingPrompt.id
        ? {
            ...p,
            name: newPrompt.name,
            category: newPrompt.category,
            description: newPrompt.description,
            prompt: newPrompt.prompt,
            tags: newPrompt.tags.split(',').map(t => t.trim()).filter(t => t),
          }
        : p
    );

    setPrompts(updatedPrompts);
    setIsEditDialogOpen(false);
    setEditingPrompt(null);
    setNewPrompt({ name: '', category: '自定义', description: '', prompt: '', tags: '' });
  };

  const handleDeletePrompt = (id: number) => {
    if (confirm('确定要删除这个提示词吗？')) {
      setPrompts(prompts.filter(p => p.id !== id));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const handleUsePrompt = (prompt: Prompt) => {
    // 跳转到智能生文页面，并传递提示词信息
    const params = new URLSearchParams();
    params.set('promptId', prompt.id.toString());
    params.set('prompt', prompt.prompt);
    window.location.href = `/smart-writing?${params.toString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 flex items-center">
            <BookOpen className="mr-3 h-8 w-8 text-purple-500" />
            提示词库
          </h1>
          <p className="text-gray-600">生成自己的人设风格提示词，或分析复刻别人的提示词</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="mr-2 h-5 w-5" />
              创建提示词
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建新提示词</DialogTitle>
              <DialogDescription>创建专属的AI写作提示词，让文章更符合你的风格</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">提示词名称</Label>
                <Input
                  id="name"
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                  placeholder="例如：情感类爆款文案"
                />
              </div>
              <div>
                <Label htmlFor="category">分类</Label>
                <Input
                  id="category"
                  value={newPrompt.category}
                  onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
                  placeholder="例如：情感、职场、自定义"
                />
              </div>
              <div>
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  value={newPrompt.description}
                  onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
                  placeholder="简短描述这个提示词的用途"
                />
              </div>
              <div>
                <Label htmlFor="prompt">提示词内容</Label>
                <Textarea
                  id="prompt"
                  value={newPrompt.prompt}
                  onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                  placeholder="输入详细的提示词内容..."
                  rows={6}
                />
              </div>
              <div>
                <Label htmlFor="tags">标签（用逗号分隔）</Label>
                <Input
                  id="tags"
                  value={newPrompt.tags}
                  onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                  placeholder="例如：情感,爆款,共鸣"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreatePrompt} className="bg-gradient-to-r from-purple-500 to-pink-500">
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑提示词</DialogTitle>
              <DialogDescription>修改提示词内容，让文章更符合你的风格</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">提示词名称</Label>
                <Input
                  id="edit-name"
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                  placeholder="例如：情感类爆款文案"
                />
              </div>
              <div>
                <Label htmlFor="edit-category">分类</Label>
                <Input
                  id="edit-category"
                  value={newPrompt.category}
                  onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
                  placeholder="例如：情感、职场、自定义"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">描述</Label>
                <Input
                  id="edit-description"
                  value={newPrompt.description}
                  onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
                  placeholder="简短描述这个提示词的用途"
                />
              </div>
              <div>
                <Label htmlFor="edit-prompt">提示词内容</Label>
                <Textarea
                  id="edit-prompt"
                  value={newPrompt.prompt}
                  onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                  placeholder="输入详细的提示词内容..."
                  rows={6}
                />
              </div>
              <div>
                <Label htmlFor="edit-tags">标签（用逗号分隔）</Label>
                <Input
                  id="edit-tags"
                  value={newPrompt.tags}
                  onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                  placeholder="例如：情感,爆款,共鸣"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdatePrompt} className="bg-gradient-to-r from-purple-500 to-pink-500">
                保存
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索提示词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">分类筛选：</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? 'bg-purple-500 hover:bg-purple-600' : ''}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            没有找到匹配的提示词
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-lg transition-shadow border-2">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant={prompt.isCustom ? 'default' : 'secondary'}>
                    {prompt.isCustom ? '自定义' : '预设'}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditPrompt(prompt)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleDeletePrompt(prompt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="flex items-center gap-2">
                  {prompt.isCustom ? <Sparkles className="h-5 w-5 text-purple-500" /> : <TrendingUp className="h-5 w-5 text-orange-500" />}
                  {prompt.name}
                </CardTitle>
                <CardDescription>{prompt.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Prompt Preview */}
                <div className="relative">
                  <p className="text-sm text-gray-600 line-clamp-3">{prompt.prompt}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                      {prompt.category}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyToClipboard(prompt.prompt)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    复制
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    onClick={() => handleUsePrompt(prompt)}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    使用
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
