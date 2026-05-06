'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, Plus, Trash2, Edit2, Copy, Check, X, FileEdit, User, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  category: string;
  description: string;
  raceContent: string;
  referenceText: string;
  prompt: string;
  generatedPrompt: string;
  authorName: string;
  personality: string;
  personaSupplement: string;
  field: string;
  targetAudience: string;
  wordCount: number;
}

const categories = [
  { value: '情感', label: '情感', icon: '💕' },
  { value: '职场', label: '职场', icon: '💼' },
  { value: '科技', label: '科技', icon: '🚀' },
  { value: '财经', label: '财经', icon: '💰' },
  { value: '娱乐', label: '娱乐', icon: '🎭' },
  { value: '生活', label: '生活', icon: '🌈' },
  { value: '其他', label: '其他', icon: '📝' },
];

const fields = [
  { value: '情感', label: '情感' },
  { value: '职场', label: '职场' },
  { value: '科技', label: '科技' },
  { value: '财经', label: '财经' },
  { value: '娱乐', label: '娱乐' },
  { value: '生活', label: '生活' },
  { value: '教育', label: '教育' },
  { value: '健康', label: '健康' },
  { value: '美食', label: '美食' },
  { value: '旅游', label: '旅游' },
  { value: '房产', label: '房产' },
  { value: '汽车', label: '汽车' },
  { value: '其他', label: '其他' },
];

export default function PromptLibrary() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const initialFormData: FormData = {
    name: '',
    category: '情感',
    description: '',
    raceContent: '',
    referenceText: '',
    prompt: '',
    generatedPrompt: '',
    authorName: '',
    personality: '',
    personaSupplement: '',
    field: '',
    targetAudience: '',
    wordCount: 1000,
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/prompt-templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePrompt = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-prompt-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceContent: formData.raceContent,
          referenceText: formData.referenceText,
          authorName: formData.authorName,
          personality: formData.personality,
          personaSupplement: formData.personaSupplement,
          field: formData.field,
          targetAudience: formData.targetAudience,
          wordCount: formData.wordCount,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          generatedPrompt: data.prompt,
          prompt: data.prompt,
        }));
        toast.success('提示词生成成功！');
      } else {
        toast.error(data.error || '生成失败');
      }
    } catch (error) {
      toast.error('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.generatedPrompt) {
      toast.error('请先生成提示词');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          prompt: formData.generatedPrompt,
          authorName: formData.authorName,
          personality: formData.personality,
          personaSupplement: formData.personaSupplement,
          field: formData.field,
          targetAudience: formData.targetAudience,
          wordCount: formData.wordCount,
          raceContent: formData.raceContent,
          referenceText: formData.referenceText,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('创建成功！');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchTemplates();
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/prompt-templates?id=${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          prompt: formData.generatedPrompt,
          authorName: formData.authorName,
          personality: formData.personality,
          personaSupplement: formData.personaSupplement,
          field: formData.field,
          targetAudience: formData.targetAudience,
          wordCount: formData.wordCount,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('更新成功！');
        setIsEditDialogOpen(false);
        setEditingTemplate(null);
        resetForm();
        fetchTemplates();
      } else {
        toast.error(data.error || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个提示词吗？')) return;

    try {
      const response = await fetch(`/api/prompt-templates?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast.success('删除成功！');
        fetchTemplates();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败，请重试');
    }
  };

  const handleCopyPrompt = async (template: PromptTemplate) => {
    try {
      await navigator.clipboard.writeText(template.prompt);
      setCopiedId(template.id);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      description: template.description || '',
      raceContent: '',
      referenceText: '',
      prompt: template.prompt,
      generatedPrompt: template.prompt,
      authorName: (template as Record<string, unknown>).authorName as string || '',
      personality: (template as Record<string, unknown>).personality as string || '',
      personaSupplement: (template as Record<string, unknown>).personaSupplement as string || '',
      field: (template as Record<string, unknown>).field as string || '',
      targetAudience: (template as Record<string, unknown>).targetAudience as string || '',
      wordCount: (template as Record<string, unknown>).wordCount as number || 1000,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingTemplate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleDialogToggle = () => {
    if (!formData.generatedPrompt) {
      if (!formData.name.trim()) {
        toast.error('请填写提示词名称');
        return;
      }
      if (!formData.raceContent.trim() && !formData.referenceText.trim()) {
        toast.error('请先输入链接或文本内容');
        return;
      }
      handleGeneratePrompt();
    } else {
      if (editingTemplate) {
        handleUpdateTemplate();
      } else {
        handleCreateTemplate();
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            提示词库
          </h1>
          <p className="text-gray-500 mt-2">管理和使用您的文章生成提示词模板</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          创建提示词
        </Button>
      </div>

      {/* 提示词列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">暂无提示词</h3>
          <p className="text-gray-400 mb-4">创建您的第一个提示词模板，开始智能创作</p>
          <Button onClick={openCreateDialog} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            创建提示词
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {categories.find(c => c.value === template.category)?.icon || '📝'}
                  </span>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                </div>
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">
                  {template.category}
                </span>
              </div>

              {template.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="text-xs text-gray-400 mb-4">
                创建于 {new Date(template.created_at).toLocaleDateString('zh-CN')}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleCopyPrompt(template)}
                >
                  {copiedId === template.id ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑对话框 */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              {editingTemplate ? '编辑提示词' : '创建提示词'}
            </DialogTitle>
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
                <Label htmlFor="category">分类</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">描述（可选）</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简短描述这个提示词的用途"
                />
              </div>
            </div>

            {/* 赛道信息 */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                选择赛道
              </h3>

              <div>
                <Label htmlFor="raceContent">链接或文本内容 *</Label>
                <Textarea
                  id="raceContent"
                  value={formData.raceContent}
                  onChange={(e) => setFormData({ ...formData, raceContent: e.target.value })}
                  placeholder="输入爆款文章链接或粘贴文章内容，系统将分析并生成提示词"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  可以是微信公众号文章链接、网页内容或直接粘贴文章文本
                </p>
              </div>

              <div>
                <Label htmlFor="referenceText">补充文本（可选）</Label>
                <Textarea
                  id="referenceText"
                  value={formData.referenceText}
                  onChange={(e) => setFormData({ ...formData, referenceText: e.target.value })}
                  placeholder="补充说明或其他参考内容"
                  rows={3}
                />
              </div>
            </div>

            {/* 人设信息 */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                人设信息
              </h3>

              <div>
                <Label htmlFor="authorName">作者姓名</Label>
                <Input
                  id="authorName"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  placeholder="设定文章作者身份"
                />
              </div>

              <div>
                <Label htmlFor="personality">人物性格</Label>
                <Textarea
                  id="personality"
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  placeholder="描述作者的性格特点，如：温暖知性、犀利幽默、专业严谨等"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="personaSupplement">人设补充</Label>
                <Textarea
                  id="personaSupplement"
                  value={formData.personaSupplement}
                  onChange={(e) => setFormData({ ...formData, personaSupplement: e.target.value })}
                  placeholder="其他补充信息，如写作风格、语言特点等"
                  rows={2}
                />
              </div>
            </div>

            {/* 文章配置 */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                文章配置
              </h3>

              <div>
                <Label htmlFor="field">文章领域</Label>
                <Select
                  value={formData.field}
                  onValueChange={(value) => setFormData({ ...formData, field: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择文章领域" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="targetAudience">目标受众</Label>
                <Input
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="如：25-35岁职场女性、创业者、中学生家长等"
                />
              </div>

              <div>
                <Label htmlFor="wordCount">文章字数要求</Label>
                <Input
                  id="wordCount"
                  type="number"
                  value={formData.wordCount}
                  onChange={(e) => setFormData({ ...formData, wordCount: parseInt(e.target.value) || 1000 })}
                  placeholder="1000"
                />
              </div>
            </div>

            {/* 生成的提示词 */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                生成提示词
              </h3>

              <Textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  prompt: e.target.value,
                  generatedPrompt: e.target.value 
                })}
                rows={6}
                className="font-mono text-sm"
                placeholder="填写提示词名称和赛道内容后，点击「开始生成」AI将自动生成提示词..."
              />
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              {!formData.generatedPrompt && formData.name && (formData.raceContent || formData.referenceText) && (
                <span className="text-purple-600">点击「开始生成」AI将分析内容生成提示词</span>
              )}
              {formData.generatedPrompt && (
                <span className="text-green-600">提示词已生成，可手动编辑后保存</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleDialogToggle}
                disabled={isGenerating || isSaving}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {isGenerating || isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isGenerating ? 'AI分析生成中...' : '保存中...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {formData.generatedPrompt ? (editingTemplate ? '保存修改' : '创建提示词') : '开始生成'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
