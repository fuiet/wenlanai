"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// 业务 API 使用相对路径
import { 
  X, FileText, Target, User, Settings, Zap, Plus, Info, AlertTriangle, 
  Lightbulb, Check, Rocket, Loader2, Trash2, Edit2, 
  Sparkles, Eye, Clock, MessageSquare, Settings2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


interface FormData {
  name: string;
  category: string;
  description: string;
  feedType: "link" | "text";
  referenceLinks: string;
  referenceText: string;
  authorName: string;
  personality: string;
  personaSupplement: string;
  field: string;
  targetAudience: string;
  titleFormat: string;
  wordCount: number;
}

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  tags: string[];
  authorName?: string;
  personality?: string;
  personaSupplement?: string;
  field?: string;
  targetAudience?: string;
  wordCount?: number;
  created_at: string;
  updated_at: string;
}

const personalityOptions = [
  { value: "emotional", label: "感性分享型", emoji: "❤️", desc: "注重情感共鸣, 善于讲故事" },
  { value: "rational", label: "理性分析型", emoji: "🧠", desc: "逻辑严密, 数据驱动" },
  { value: "practical", label: "实战指导型", emoji: "🛠️", desc: "注重可操作性, 直接给出方案" },
  { value: "humor", label: "幽默风趣型", emoji: "😄", desc: "善用比喻段子, 轻松活泼" },
  { value: "academic", label: "学术严谨型", emoji: "📚", desc: "引经据典, 理论扎实" },
  { value: "innovative", label: "创新思维型", emoji: "💡", desc: "善于跳出常规, 提出新观点" },
  { value: "warm", label: "温暖亲切型", emoji: "🤗", desc: "语气温和, 善于安慰鼓励" },
  { value: "sharp", label: "犀利直接型", emoji: "🎯", desc: "观点鲜明, 不绕弯子" },
];

const fieldOptions = [
  { value: "entertainment", label: "娱乐八卦", emoji: "🎭" },
  { value: "automobile", label: "汽车资讯", emoji: "🚗" },
  { value: "military", label: "军事天下", emoji: "⚔️" },
  { value: "international", label: "国际新闻", emoji: "🌐" },
  { value: "education", label: "教育资讯", emoji: "📚" },
  { value: "sports", label: "体育竞技", emoji: "🏀" },
  { value: "emotional_story", label: "情感故事", emoji: "❤️" },
  { value: "career", label: "职场生涯", emoji: "💼" },
  { value: "finance", label: "财经理财", emoji: "💰" },
  { value: "tech", label: "科技数码", emoji: "📱" },
  { value: "health", label: "健康养生", emoji: "🏥" },
  { value: "lifestyle", label: "生活时尚", emoji: "🍽️" },
  { value: "parenting", label: "育儿亲子", emoji: "👶" },
  { value: "culture", label: "文化艺术", emoji: "🎨" },
  { value: "gaming", label: "游戏动漫", emoji: "🎮" },
  { value: "food", label: "美食烹饪", emoji: "🍳" },
  { value: "travel", label: "旅行攻略", emoji: "🗺️" },
  { value: "science", label: "科学科普", emoji: "🔬" },
  { value: "growth", label: "个人成长", emoji: "🌱" },
  { value: "self_media", label: "自媒体IP", emoji: "📱" },
  { value: "other", label: "其他", emoji: "📌" },
];

const audienceOptions = [
  { value: "college_student", label: "大学生", desc: "18-22岁, 学业和职业规划阶段" },
  { value: "young_worker", label: "职场新人", desc: "22-28岁, 职场适应和成长阶段" },
  { value: "mid_career", label: "中层管理者", desc: "28-40岁, 职业发展和家庭责任" },
  { value: "senior", label: "资深人士", desc: "40岁以上, 行业专家或创业者" },
  { value: "parent", label: "宝爸宝妈", desc: "有孩子的家长群体" },
  { value: "investor", label: "投资者", desc: "关注理财和投资的人群" },
  { value: "female", label: "女性用户", desc: "20-40岁女性群体" },
  { value: "male", label: "男性用户", desc: "20-40岁男性群体" },
  { value: "general", label: "通用人群", desc: "无特定人群定位" },
];

const titleFormatOptions = [
  { value: "question", label: "疑问句式", desc: "引发好奇, 如: 为什么你总是..." },
  { value: "number", label: "数字列表式", desc: "结构清晰, 如: 5个方法教你..." },
  { value: "negative", label: "否定式", desc: "打破认知, 如: 你以为...其实..." },
  { value: "hot", label: "蹭热点式", desc: "结合时事, 吸引流量" },
  { value: "story", label: "故事悬念式", desc: "引发好奇, 如: 他是如何..." },
  { value: "summary", label: "总结归纳式", desc: "提炼精华, 如: 关于...的一切" },
];

const categoryIconMap: Record<string, string> = {
  "情感": "❤️",
  "职场": "💼",
  "科技": "💻",
  "财经": "💰",
  "娱乐": "🎭",
  "生活": "🍽️",
  "军事": "⚔️",
  "其他": "📌",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN");
}

export default function PromptLibraryPage() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "",
    description: "",
    feedType: "link",
    referenceLinks: "",
    referenceText: "",
    authorName: "",
    personality: "",
    personaSupplement: "",
    field: "",
    targetAudience: "",
    titleFormat: "",
    wordCount: 1000,
  });

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [categories, setCategories] = useState<string[]>(["情感", "职场", "科技", "财经", "娱乐", "生活", "其他"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 分类管理弹窗状态
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    prompt: "",
  });

  useEffect(() => {
    if (!showCreateForm) {
      fetchTemplates();
    }
  }, [showCreateForm]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/prompt-templates", { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("获取提示词失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCategory = () => {
    if (!newCategory.name.trim()) {
      toast.error("请输入赛道名称");
      return;
    }
    if (!categories.includes(newCategory.name)) {
      setCategories([...categories, newCategory.name]);
    }
    setFormData((prev) => ({ ...prev, category: newCategory.name }));
    setNewCategory({ name: "", description: "" });
    setShowNewCategory(false);
    toast.success("赛道创建成功");
  };

  // 打开分类管理弹窗
  const openCategoryManager = () => {
    setShowCategoryManager(true);
  };

  // 开始编辑分类名称
  const startEditingCategory = (catName: string) => {
    setEditingCategoryName(catName);
    setEditingCategoryNewName(catName);
  };

  // 保存编辑的分类名称
  const saveEditingCategory = () => {
    if (!editingCategoryName || !editingCategoryNewName.trim()) {
      toast.error("请输入分类名称");
      return;
    }
    if (editingCategoryNewName === editingCategoryName) {
      setEditingCategoryName(null);
      return;
    }
    // 检查是否已存在该名称
    if (categories.includes(editingCategoryNewName)) {
      toast.error("该分类名称已存在");
      return;
    }
    // 更新分类名称
    setCategories(categories.map(cat => cat === editingCategoryName ? editingCategoryNewName : cat));
    // 更新提示词的分类名称
    setTemplates(templates.map(t => t.category === editingCategoryName ? { ...t, category: editingCategoryNewName } : t));
    toast.success("分类名称已更新");
    setEditingCategoryName(null);
  };

  // 取消编辑
  const cancelEditingCategory = () => {
    setEditingCategoryName(null);
    setEditingCategoryNewName("");
  };

  // 确认删除分类
  const confirmDeleteCategory = (catName: string) => {
    setCategoryToDelete(catName);
  };

  // 执行删除分类
  const executeDeleteCategory = () => {
    if (!categoryToDelete) return;
    setCategories(categories.filter(cat => cat !== categoryToDelete));
    if (selectedCategory === categoryToDelete) {
      setSelectedCategory(null);
    }
    toast.success("分类已删除");
    setCategoryToDelete(null);
  };

  // 创建新分类（管理弹窗中）
  const handleCreateCategoryInManager = () => {
    if (!newCategoryName.trim()) {
      toast.error("请输入分类名称");
      return;
    }
    if (categories.includes(newCategoryName)) {
      toast.error("该分类名称已存在");
      return;
    }
    setCategories([...categories, newCategoryName]);
    toast.success("分类创建成功");
    setNewCategoryName("");
    setCreatingCategory(false);
  };

  // 统计每个分类的提示词数量
  const getCategoryCount = (catName: string) => {
    return templates.filter(t => t.category === catName).length;
  };

  const handleGenerate = async () => {
    if (!formData.category) {
      toast.error("请选择赛道");
      return;
    }
    if (formData.feedType === "link" && !formData.referenceLinks.trim()) {
      toast.error("请输入参考链接");
      return;
    }
    if (formData.feedType === "text" && !formData.referenceText.trim()) {
      toast.error("请输入投喂文本");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-prompt-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          raceType: formData.feedType,
          raceContent: formData.feedType === "link" ? formData.referenceLinks : formData.referenceText,
          persona: {
            authorName: formData.authorName,
            personality: formData.personality,
            personaSupplement: formData.personaSupplement,
          },
          articleConfig: {
            field: formData.field,
            targetAudience: formData.targetAudience,
            noSubheading: false,
            wordCount: formData.wordCount,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedPrompt(data.prompt);
        if (!formData.name && data.suggestedName) {
          setFormData((prev) => ({ ...prev, name: data.suggestedName }));
        }
        toast.success("提示词生成成功");
      } else {
        toast.error(data.error || "生成失败");
      }
    } catch {
      toast.error("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.category) {
      toast.error("请选择赛道");
      return;
    }
    if (!generatedPrompt.trim()) {
      toast.error("请先生成提示词");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/prompt-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name || "未命名提示词",
          category: formData.category,
          description: formData.description,
          prompt: generatedPrompt,
          tags: [],
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
        toast.success("提示词创建成功");
        setGeneratedPrompt("");
        setFormData({
          name: "",
          category: "",
          description: "",
          feedType: "link",
          referenceLinks: "",
          referenceText: "",
          authorName: "",
          personality: "",
          personaSupplement: "",
          field: "",
          targetAudience: "",
          titleFormat: "",
          wordCount: 1000,
        });
        setShowCreateForm(false);
        fetchTemplates();
      } else {
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    // 弹出确认对话框
    if (!window.confirm('确定要删除这条提示词吗？')) {
      return;
    }
    try {
      const res = await fetch(`/api/prompt-templates?id=${id}`, { 
        method: "DELETE",
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(templates.filter((t) => t.id !== id));
        toast.success("删除成功");
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setEditFormData({
      name: template.name,
      prompt: template.prompt,
    });
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const response = await fetch(`/api/prompt-templates?id=${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          name: editFormData.name,
          prompt: editFormData.prompt,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("更新成功");
        setTemplates(templates.map((t) => 
          t.id === editingTemplate.id 
            ? { ...t, name: editFormData.name, prompt: editFormData.prompt }
            : t
        ));
        setEditingTemplate(null);
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch {
      toast.error("更新失败");
    }
  };

  // 过滤后的提示词列表
  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  const canGenerate = formData.category && 
    ((formData.feedType === "link" && formData.referenceLinks.trim()) || 
     (formData.feedType === "text" && formData.referenceText.trim()));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">提示词库</h1>
                <p className="text-sm text-gray-500">管理和生成AI提示词</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setShowCreateForm(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              生成提示词
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {showCreateForm ? (
          /* 一键生成提示词表单 */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* 顶部标题 */}
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">一键生成提示词</h2>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 表单内容 */}
            <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
              {/* 提示词名称 */}
              <FormSection icon={<FileText className="w-5 h-5" />} label="提示词名称" optional>
                <p className="text-sm text-gray-500 mb-3">便于区分和选择, 不填写将自动生成</p>
                <Input
                  placeholder="可以填写对标账号的名字, 方便区分"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="border-gray-200 focus:border-orange-400 focus:ring-orange-100"
                />
              </FormSection>

              {/* 选择赛道 */}
              <FormSection icon={<Target className="w-5 h-5 text-red-500" />} label="选择赛道" required>
                <p className="text-sm text-gray-500 mb-3">按内容领域分类, 方便管理和筛选提示词</p>
                {!showNewCategory ? (
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="选择赛道" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <span>{categoryIconMap[cat] || "📌"}</span>
                            <span>{cat}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <div
                        className="flex items-center gap-2 px-2 py-2 text-orange-500 cursor-pointer hover:bg-orange-50 rounded-b-lg"
                        onClick={() => {
                          setShowNewCategory(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>新建赛道</span>
                      </div>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                    <Input
                      placeholder="赛道名称"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="border-gray-200"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="赛道描述"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        className="border-gray-200"
                      />
                      <span className="text-xs text-gray-400 whitespace-nowrap">可选</span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => {
                        handleCreateCategory();
                      }} className="bg-orange-500 hover:bg-orange-600 text-white">
                        确定
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewCategory(false)}>
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </FormSection>

              {/* 投喂素材方式 */}
              <FormSection icon={<Zap className="w-5 h-5 text-red-500" />} label="投喂素材方式" required>
                <RadioGroup
                  value={formData.feedType}
                  onValueChange={(value) => handleInputChange("feedType", value as "link" | "text")}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="link" id="link" className="text-blue-500" />
                    <Label htmlFor="link" className="cursor-pointer">投喂链接</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="text" id="text" className="text-blue-500" />
                    <Label htmlFor="text" className="cursor-pointer">直接投喂文本</Label>
                  </div>
                </RadioGroup>
              </FormSection>

              {/* 参考链接/文本 */}
              {formData.feedType === "link" ? (
                <FormSection icon={<Zap className="w-5 h-5 text-red-500" />} label="参考链接" required>
                  <Textarea
                    placeholder="https://mp.weixin.qq.com/s/...\nhttps://www.toutiao.com/article/..."
                    value={formData.referenceLinks}
                    onChange={(e) => handleInputChange("referenceLinks", e.target.value)}
                    rows={5}
                    className="border-gray-200 focus:border-orange-400 focus:ring-orange-100"
                  />
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-gray-700">提示: 多个链接能更准确模仿对标账号的写作风格,生成更优质的提示词</p>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                      <p className="text-gray-700">建议: 多个链接应来自同一对标账号, 避免风格混乱, 建议5个左右最佳</p>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-gray-700">支持: 公众号文章和今日头条链接, 最多7个, 每行一个</p>
                    </div>
                  </div>
                </FormSection>
              ) : (
                <FormSection icon={<Zap className="w-5 h-5 text-red-500" />} label="直接投喂文本" required>
                  <Textarea
                    placeholder="请粘贴需要分析的文章内容..."
                    value={formData.referenceText}
                    onChange={(e) => handleInputChange("referenceText", e.target.value)}
                    rows={8}
                    className="border-gray-200 focus:border-orange-400 focus:ring-orange-100"
                  />
                </FormSection>
              )}

              {/* 人设信息 */}
              <FormSection icon={<User className="w-5 h-5" />} label="人设信息">
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500 text-sm">作者姓名</Label>
                    <span className="text-xs text-gray-400 ml-1">可选</span>
                    <Input
                      placeholder="如: 王姐、老张、小李"
                      value={formData.authorName}
                      onChange={(e) => handleInputChange("authorName", e.target.value)}
                      className="mt-1 border-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">性格特质</Label>
                    <span className="text-xs text-gray-400 ml-1">可选</span>
                    <Select value={formData.personality} onValueChange={(value) => handleInputChange("personality", value)}>
                      <SelectTrigger className="mt-1 border-gray-200">
                        <SelectValue placeholder="请选择性格特质" />
                      </SelectTrigger>
                      <SelectContent>
                        {personalityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span>{opt.emoji}</span>
                              <span>{opt.label}</span>
                              <span className="text-gray-400 text-xs">- {opt.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">人设补充</Label>
                    <span className="text-xs text-gray-400 ml-1">可选</span>
                    <Textarea
                      placeholder="如: 35岁情感咨询师, 擅长通过真实案例帮助读者解决情感困惑..."
                      value={formData.personaSupplement}
                      onChange={(e) => handleInputChange("personaSupplement", e.target.value)}
                      rows={3}
                      className="mt-1 border-gray-200"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{formData.personaSupplement.length}/500字</p>
                  </div>
                </div>
              </FormSection>

              {/* 文章配置 */}
              <FormSection icon={<Settings className="w-5 h-5" />} label="文章配置">
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500 text-sm">文章领域</Label>
                    <span className="text-xs text-gray-400 ml-1">可选</span>
                    <Select value={formData.field} onValueChange={(value) => handleInputChange("field", value)}>
                      <SelectTrigger className="mt-1 border-gray-200">
                        <SelectValue placeholder="请选择文章领域" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span>{opt.emoji}</span>
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">目标受众</Label>
                    <span className="text-xs text-gray-400 ml-1">可选</span>
                    <Select value={formData.targetAudience} onValueChange={(value) => handleInputChange("targetAudience", value)}>
                      <SelectTrigger className="mt-1 border-gray-200">
                        <SelectValue placeholder="请选择目标受众" />
                      </SelectTrigger>
                      <SelectContent>
                        {audienceOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span>{opt.label}</span>
                              <span className="text-gray-400 text-xs">- {opt.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">二级标题格式</Label>
                    <span className="text-xs text-gray-400 ml-1">可选</span>
                    <Select value={formData.titleFormat} onValueChange={(value) => handleInputChange("titleFormat", value)}>
                      <SelectTrigger className="mt-1 border-gray-200">
                        <SelectValue placeholder="请选择二级标题格式" />
                      </SelectTrigger>
                      <SelectContent>
                        {titleFormatOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <span>{opt.label}</span>
                              <span className="text-gray-400 text-xs">- {opt.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">文章字数要求</Label>
                    <span className="text-xs text-gray-400 ml-1">可选</span>
                    <Input
                      type="number"
                      value={formData.wordCount}
                      onChange={(e) => handleInputChange("wordCount", parseInt(e.target.value) || 1000)}
                      className="mt-1 border-gray-200 w-32"
                      min={100}
                      max={10000}
                    />
                    <p className="text-xs text-gray-400 mt-1">默认1000字, 范围100-10000字</p>
                  </div>
                </div>
              </FormSection>

              {/* 生成的提示词预览 */}
              {generatedPrompt && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">生成的提示词</h3>
                    <Textarea
                      value={generatedPrompt}
                      onChange={(e) => setGeneratedPrompt(e.target.value)}
                      rows={10}
                      className="border-gray-200 bg-white font-mono text-sm"
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                <div className="flex items-center gap-2 text-sm">
                  {canGenerate ? (
                    <>
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-700">已选择赛道和素材，可以开始生成</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                        <span className="text-white text-xs">!</span>
                      </div>
                      <span className="text-gray-500">
                        {formData.category 
                          ? "请输入参考链接" 
                          : "请先选择赛道和输入参考链接"}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                  >
                    取消
                  </Button>
                  {!generatedPrompt ? (
                    <Button
                      onClick={() => {
                        handleGenerate();
                      }}
                      disabled={!canGenerate || isGenerating}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4 mr-2 text-yellow-300" />
                          开始生成
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        handleSave();
                      }}
                      disabled={isSaving}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          创建提示词
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 提示词列表 + 左侧分类栏 */
          <div className="flex gap-6">
            {/* 左侧分类栏 */}
            <div className="w-64 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">赛道分类</h3>
                  <span className="text-xs text-gray-400">
                    {categories.length}个分类 · {templates.length}个提示词
                  </span>
                </div>
                
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      selectedCategory === null
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="flex-1">全部提示词</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      selectedCategory === null ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    )}>
                      {templates.length}
                    </span>
                  </button>
                  
                  {categories.map((cat) => {
                    const count = templates.filter((t) => t.category === cat).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          selectedCategory === cat
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        <span>{categoryIconMap[cat] || "📌"}</span>
                        <span className="flex-1">{cat}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          selectedCategory === cat ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                        )}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      openCategoryManager();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Settings2 className="w-4 h-4" />
                    <span>管理分类</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧提示词列表 */}
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCategory ? `${selectedCategory}分类` : '全部提示词'}
                  </h3>
                  <span className="text-sm text-gray-500">共{filteredTemplates.length}个提示词</span>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-20">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">暂无提示词</h3>
                    <p className="text-gray-400 mb-4">创建您的第一个提示词模板，开始智能创作</p>
                    <Button onClick={() => {
                      setShowCreateForm(true);
                    }} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成提示词
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                      >
                        {/* 状态标签 */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">
                            <Check className="w-3 h-3" />
                            已完成
                          </span>
                        </div>

                        {/* 标题 */}
                        <h4 className="font-bold text-gray-900 text-base mb-2">{template.name}</h4>

                        {/* 分类标签 */}
                        <div className="flex items-center gap-1 mb-2">
                          <span className="inline-flex items-center gap-0.5 px-2 py-1 bg-orange-500 text-white rounded-full text-xs font-medium">
                            {categoryIconMap[template.category] || "📌"}
                            {template.category}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {String((template as unknown as Record<string, unknown>)?.article_count || 1)} 篇
                          </span>
                        </div>

                        {/* 创建时间 */}
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                          <Clock className="w-3 h-3" />
                          创建于 {formatTimeAgo(template.created_at)}
                        </div>

                        {/* 分隔线 */}
                        <div className="border-t border-gray-100 my-3" />

                        {/* 底部操作栏 */}
                        <div className="flex items-center justify-between">
                          {/* 查看按钮 */}
                          <button
                            onClick={() => {
                              handleEditTemplate(template);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm font-medium">查看</span>
                          </button>

                          {/* 编辑和删除图标 */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                handleEditTemplate(template);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(template.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 编辑提示词弹窗 */}
        {editingTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">查看提示词</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingTemplate(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* 内容 */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">提示词名称</Label>
                    <Input
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="输入提示词名称"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">提示词内容</Label>
                    <Textarea
                      value={editFormData.prompt}
                      onChange={(e) => setEditFormData({ ...editFormData, prompt: e.target.value })}
                      placeholder="输入提示词内容"
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* 底部操作 */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    handleUpdateTemplate();
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  保存修改
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 赛道分类管理弹窗 */}
        {showCategoryManager && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
              {/* 头部 */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                    <Settings2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">赛道分类管理</h3>
                    <p className="text-xs text-gray-500">管理您的分组 · {categories.length}个</p>
                  </div>
                </div>
              </div>

              {/* 分类列表 */}
              <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-3">
                  {categories.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      暂无分类，点击下方创建新分组
                    </div>
                  ) : (
                    categories.map((cat) => {
                      const count = getCategoryCount(cat);
                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                        >
                          {editingCategoryName === cat ? (
                            // 编辑模式
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editingCategoryNewName}
                                onChange={(e) => setEditingCategoryNewName(e.target.value)}
                                className="flex-1 h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditingCategory();
                                  if (e.key === "Escape") cancelEditingCategory();
                                }}
                              />
                              <Button size="sm" onClick={() => {
                                saveEditingCategory();
                              }} className="h-8 bg-blue-500 hover:bg-blue-600">
                                保存
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditingCategory} className="h-8">
                                取消
                              </Button>
                            </div>
                          ) : (
                            // 显示模式
                            <>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs">{categoryIconMap[cat] || "📌"}</span>
                                </div>
                                <span className="font-medium text-gray-800">{cat}</span>
                                <span className="text-xs text-gray-400">({count}个)</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    startEditingCategory(cat);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    confirmDeleteCategory(cat);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 创建新分组 */}
                <div className="mt-4">
                  {creatingCategory ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="输入分组名称"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 h-10"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateCategoryInManager();
                          if (e.key === "Escape") setCreatingCategory(false);
                        }}
                      />
                      <Button onClick={() => {
                        handleCreateCategoryInManager();
                      }} className="h-10 bg-blue-500 hover:bg-blue-600">
                        创建
                      </Button>
                      <Button variant="outline" onClick={() => setCreatingCategory(false)} className="h-10">
                        取消
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCreatingCategory(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      创建新分组
                    </button>
                  )}
                </div>
              </div>

              {/* 底部完成按钮 */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <Button
                  onClick={() => setShowCategoryManager(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                >
                  完成
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认弹窗 */}
        {categoryToDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除</h3>
                <p className="text-gray-500 mb-2">
                  确定要删除分类"{categoryToDelete}"吗？
                </p>
                <p className="text-sm text-gray-400">
                  该分类下的 {getCategoryCount(categoryToDelete)} 个提示词将被保留，但分类将变为空
                </p>
              </div>
              <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
                <Button
                  variant="outline"
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={() => {
                    executeDeleteCategory();
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  确认删除
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 表单区块组件
function FormSection({
  icon,
  label,
  optional,
  required,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  optional?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-400">{icon}</span>
        <h3 className="font-semibold text-gray-900">{label}</h3>
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-xs text-gray-400">可选</span>}
      </div>
      {children}
    </div>
  );
}
