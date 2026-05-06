'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen,
  Plus,
  Search,
  Wand2,
  Copy,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  Link,
  FileText,
  ChevronDown,
  ChevronUp,
  User,
  Settings,
  FileEdit
} from 'lucide-react';

// 提示词模板类型
interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  // 赛道信息
  raceType: 'link' | 'text';
  raceContent: string;
  // 人设信息
  persona: {
    authorName: string;
    personality: string;
    personaSupplement: string;
  };
  // 文章配置
  articleConfig: {
    field: string;
    targetAudience: string;
    noSubheading: boolean;
    wordCount: number;
  };
  // 生成的提示词
  generatedPrompt: string;
  tags: string[];
  isCustom: boolean;
  createdAt: string;
}

const categories = ['全部', '情感', '职场', '民生', '财经', '科技', '娱乐', '星座', '汽车', '美食', '自定义'];

// 文章领域选项
const articleFields = [
  '情感故事', '职场成长', '民生百态', '财经投资', '科技数码', 
  '娱乐八卦', '星座运势', '汽车评测', '美食探店', '教育育儿', 
  '健康养生', '家居生活', '旅游攻略', '职场人际', '自我成长'
];

// 目标受众选项
const targetAudiences = [
  '职场新人', '职场老手', '企业高管', '创业者和企业家', '自由职业者',
  '大学生群体', '中年群体', '新手父母', '宝爸宝妈', '中老年群体',
  '学生群体', '家长群体', '年轻人', '男性用户', '女性用户',
  '单身人群', '新婚夫妇', '普通大众'
];

// 默认提示词模板
const defaultTemplates: PromptTemplate[] = [
  {
    id: 'default-1',
    name: '情感类爆款文案',
    category: '情感',
    description: '擅长写触动人心的情感类文章，引发共鸣',
    raceType: 'text',
    raceContent: '',
    persona: {
      authorName: '',
      personality: '温暖细腻、善于通过生活细节和真实情感打动读者',
      personaSupplement: ''
    },
    articleConfig: {
      field: '情感故事',
      targetAudience: '年轻人',
      noSubheading: false,
      wordCount: 1000
    },
    generatedPrompt: '你是一位情感类自媒体写作专家，擅长创作触动人心、引发共鸣的爆款文章。你的写作风格温暖细腻，善于通过生活细节和真实情感打动读者。',
    tags: ['情感', '爆款', '共鸣'],
    isCustom: false,
    createdAt: ''
  },
  {
    id: 'default-2',
    name: '职场成长导师',
    category: '职场',
    description: '职场经验分享，帮助职场人成长',
    raceType: 'text',
    raceContent: '',
    persona: {
      authorName: '',
      personality: '资深职场导师，拥有10年以上HR和职场管理经验',
      personaSupplement: ''
    },
    articleConfig: {
      field: '职场成长',
      targetAudience: '职场新人',
      noSubheading: false,
      wordCount: 1000
    },
    generatedPrompt: '你是一位资深职场导师，拥有10年以上HR和职场管理经验。擅长分享实用的职场干货和成长建议，帮助职场人解决工作难题。',
    tags: ['职场', '干货', '成长'],
    isCustom: false,
    createdAt: ''
  }
];

export default function PromptLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  // 提示词模板状态
  const [templates, setTemplates] = useState<PromptTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wenlan-prompt-templates');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return defaultTemplates;
        }
      }
    }
    return defaultTemplates;
  });

  // 新建/编辑表单状态
  const [formData, setFormData] = useState<PromptTemplate>({
    id: '',
    name: '',
    category: '自定义',
    description: '',
    raceType: 'link',
    raceContent: '',
    persona: {
      authorName: '',
      personality: '',
      personaSupplement: ''
    },
    articleConfig: {
      field: '情感故事',
      targetAudience: '年轻人',
      noSubheading: false,
      wordCount: 1000
    },
    generatedPrompt: '',
    tags: [],
    isCustom: true,
    createdAt: ''
  });

  // 保存到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wenlan-prompt-templates', JSON.stringify(templates));
    }
  }, [templates]);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '全部' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 生成提示词
  const handleGeneratePrompt = async () => {
    if (!formData.name.trim()) {
      toast({ title: '请先填写提示词名称', variant: 'destructive' });
      return;
    }

    if (!formData.raceContent.trim()) {
      toast({ title: '请先填写赛道内容（链接或文本）', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-prompt-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceType: formData.raceType,
          raceContent: formData.raceContent,
          persona: formData.persona,
          articleConfig: formData.articleConfig
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({ ...prev, generatedPrompt: data.prompt }));
        toast({ title: '提示词生成成功！', description: '请查看生成结果，可进行微调' });
      } else {
        toast({ title: '生成失败', description: data.error || '请稍后重试', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '生成失败', description: '网络错误，请稍后重试', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // 创建提示词模板
  const handleCreateTemplate = () => {
    if (!formData.name.trim()) {
      toast({ title: '请填写提示词名称', variant: 'destructive' });
      return;
    }

    const newTemplate: PromptTemplate = {
      ...formData,
      id: `template-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    setTemplates([...templates, newTemplate]);
    setIsCreateDialogOpen(false);
    resetForm();
    toast({ title: '创建成功', description: '提示词模板已保存' });
  };

  // 更新提示词模板
  const handleUpdateTemplate = () => {
    if (!editingTemplate || !formData.name.trim()) {
      toast({ title: '请填写提示词名称', variant: 'destructive' });
      return;
    }

    const updatedTemplates = templates.map(t => 
      t.id === editingTemplate.id ? { ...formData, id: editingTemplate.id, createdAt: t.createdAt } : t
    );

    setTemplates(updatedTemplates);
    setIsEditDialogOpen(false);
    setEditingTemplate(null);
    resetForm();
    toast({ title: '保存成功', description: '提示词模板已更新' });
  };

  // 删除提示词
  const handleDeleteTemplate = (id: string) => {
    if (confirm('确定要删除这个提示词吗？')) {
      setTemplates(templates.filter(t => t.id !== id));
      toast({ title: '已删除' });
    }
  };

  // 使用提示词
  const handleUsePrompt = (template: PromptTemplate) => {
    const params = new URLSearchParams();
    params.set('templateId', template.id);
    params.set('template', JSON.stringify(template));
    window.location.href = `/smart-writing?${params.toString()}`;
  };

  // 编辑提示词
  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setFormData({ ...template });
    setShowAdvanced(true);
    setIsEditDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      category: '自定义',
      description: '',
      raceType: 'link',
      raceContent: '',
      persona: {
        authorName: '',
        personality: '',
        personaSupplement: ''
      },
      articleConfig: {
        field: '情感故事',
        targetAudience: '年轻人',
        noSubheading: false,
        wordCount: 1000
      },
      generatedPrompt: '',
      tags: [],
      isCustom: true,
      createdAt: ''
    });
    setShowAdvanced(false);
  };

  // 打开创建对话框
  const handleOpenCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
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
          <p className="text-gray-600">创建和管理你的人设风格提示词，生成文章时自动应用</p>
        </div>
        <Button 
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="mr-2 h-5 w-5" />
          创建提示词
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索提示词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'bg-purple-500' : ''}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Template List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">{template.category}</Badge>
                </div>
                {template.isCustom && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription className="mt-2">{template.description || '暂无描述'}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 人设信息预览 */}
              {template.persona.personality && (
                <div className="mb-3 text-sm text-gray-600">
                  <span className="font-medium">风格：</span>{template.persona.personality.slice(0, 50)}...
                </div>
              )}
              {/* 文章配置预览 */}
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="outline">{template.articleConfig.field}</Badge>
                <Badge variant="outline">{template.articleConfig.targetAudience}</Badge>
                <Badge variant="outline">{template.articleConfig.wordCount}字</Badge>
                {template.articleConfig.noSubheading && <Badge variant="outline">无二级标题</Badge>}
              </div>
              {/* 标签 */}
              {template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={() => handleUsePrompt(template)}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                使用此提示词
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>暂无提示词模板，点击上方按钮创建</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑提示词' : '创建新提示词'}</DialogTitle>
            <DialogDescription>
              设置你的人设风格和文章配置，AI将根据这些信息生成专属提示词
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* 基础信息 */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <FileEdit className="h-4 w-4" />
                基础信息
              </h3>
              
              <div>
                <Label htmlFor="name">提示词名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：我的情感爆款风格"
                />
              </div>

              <div>
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简短描述这个提示词的用途"
                />
              </div>

              <div>
                <Label htmlFor="category">分类</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== '全部').map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 赛道信息 */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                选择赛道
              </h3>
              <p className="text-sm text-gray-500">投喂链接或文本，AI将分析文章信息，倒推生成提示词</p>
              
              <Tabs value={formData.raceType} onValueChange={(v: 'link' | 'text') => setFormData({ ...formData, raceType: v })}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="link" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    投喂链接
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    投喂文本
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="link" className="mt-4">
                  <Textarea
                    value={formData.raceContent}
                    onChange={(e) => setFormData({ ...formData, raceContent: e.target.value })}
                    placeholder="粘贴公众号文章链接，AI将分析文章内容倒推提示词..."
                    rows={4}
                  />
                </TabsContent>
                
                <TabsContent value="text" className="mt-4">
                  <Textarea
                    value={formData.raceContent}
                    onChange={(e) => setFormData({ ...formData, raceContent: e.target.value })}
                    placeholder="粘贴文章内容，AI将分析写作风格和特点..."
                    rows={6}
                  />
                </TabsContent>
              </Tabs>

              <Button 
                onClick={handleGeneratePrompt} 
                disabled={isGenerating || !formData.raceContent.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI分析中...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    AI分析生成提示词
                  </>
                )}
              </Button>
            </div>

            {/* 高级设置 */}
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  高级设置
                </span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {showAdvanced && (
                <div className="space-y-6 mt-4">
                  {/* 人设信息 */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2 text-purple-600">
                      <User className="h-4 w-4" />
                      人设信息
                    </h4>
                    
                    <div>
                      <Label htmlFor="authorName">作者姓名</Label>
                      <Input
                        id="authorName"
                        value={formData.persona.authorName}
                        onChange={(e) => setFormData({
                          ...formData,
                          persona: { ...formData.persona, authorName: e.target.value }
                        })}
                        placeholder="如：李明说职场"
                      />
                    </div>

                    <div>
                      <Label htmlFor="personality">人物性格 *</Label>
                      <Textarea
                        id="personality"
                        value={formData.persona.personality}
                        onChange={(e) => setFormData({
                          ...formData,
                          persona: { ...formData.persona, personality: e.target.value }
                        })}
                        placeholder="描述你的写作风格，如：温暖细腻、幽默风趣、干货满满..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="personaSupplement">人设补充</Label>
                      <Textarea
                        id="personaSupplement"
                        value={formData.persona.personaSupplement}
                        onChange={(e) => setFormData({
                          ...formData,
                          persona: { ...formData.persona, personaSupplement: e.target.value }
                        })}
                        placeholder="补充你的人设信息，如：10年职场经验、资深HR背景..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* 文章配置 */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2 text-purple-600">
                      <FileEdit className="h-4 w-4" />
                      文章配置
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="field">文章领域</Label>
                        <Select 
                          value={formData.articleConfig.field} 
                          onValueChange={(v) => setFormData({
                            ...formData,
                            articleConfig: { ...formData.articleConfig, field: v }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {articleFields.map(field => (
                              <SelectItem key={field} value={field}>{field}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="audience">目标受众</Label>
                        <Select 
                          value={formData.articleConfig.targetAudience} 
                          onValueChange={(v) => setFormData({
                            ...formData,
                            articleConfig: { ...formData.articleConfig, targetAudience: v }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {targetAudiences.map(aud => (
                              <SelectItem key={aud} value={aud}>{aud}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="wordCount">文章字数要求</Label>
                      <Input
                        id="wordCount"
                        type="number"
                        value={formData.articleConfig.wordCount}
                        onChange={(e) => setFormData({
                          ...formData,
                          articleConfig: { ...formData.articleConfig, wordCount: parseInt(e.target.value) || 1000 }
                        })}
                        placeholder="1000"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="noSubheading">不使用二级标题</Label>
                        <p className="text-sm text-gray-500">开启后将生成纯段落式文章</p>
                      </div>
                      <Switch
                        id="noSubheading"
                        checked={formData.articleConfig.noSubheading}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          articleConfig: { ...formData.articleConfig, noSubheading: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 生成的提示词 */}
            {formData.generatedPrompt && (
              <div className="space-y-2">
                <Label>生成的提示词</Label>
                <Textarea
                  value={formData.generatedPrompt}
                  onChange={(e) => setFormData({ ...formData, generatedPrompt: e.target.value })}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">可手动微调提示词内容</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              resetForm();
            }}>
              取消
            </Button>
            <Button 
              onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
              disabled={!formData.name.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {editingTemplate ? '保存修改' : '创建提示词'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
