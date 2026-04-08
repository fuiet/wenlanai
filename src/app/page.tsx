'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Zap, 
  BookOpen, 
  PenTool, 
  LayoutTemplate, 
  UserCheck,
  TrendingUp,
  Shield,
  Rocket,
  ArrowRight,
  Star
} from 'lucide-react';

const features = [
  {
    icon: PenTool,
    title: '智能生文',
    description: 'AI 写文、智能配图，一键生成完整文章',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: TrendingUp,
    title: '每日爆款',
    description: '实时更新低粉爆款，可按阅读/点赞排序参考',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: LayoutTemplate,
    title: '一键排版',
    description: '10+ 主题样式，自定义字体、颜色、间距',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: UserCheck,
    title: '一键推草稿',
    description: '批量推送文章到公众号草稿箱',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: BookOpen,
    title: '文章库',
    description: '云端存储、多端同步、可随时编辑',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: Zap,
    title: '提示词库',
    description: '预设模板 + 自定义，快速生成专属 prompt',
    color: 'from-yellow-500 to-yellow-600',
  },
];

const categories = [
  '汽车',
  '民生',
  '娱乐',
  '个人成长',
  '星座情感',
  '科技数码',
  '财经理财',
  '职场干货',
];

const advantages = [
  {
    icon: Rocket,
    title: '快速出文',
    description: '解决没灵感、效率低痛点，实时低粉爆文素材，对标写作手法',
  },
  {
    icon: TrendingUp,
    title: '追热点快',
    description: '每日实时更新爆款内容，快速响应热点事件，抢占流量先机',
  },
  {
    icon: Shield,
    title: '全流程自动化',
    description: '大幅减少复制粘贴与排版时间，适合个人博主、矩阵号、副业变现',
  },
];

const stats = [
  { value: '10W+', label: '累计生成文章' },
  { value: '5K+', label: '活跃用户' },
  { value: '100+', label: '覆盖赛道' },
  { value: '98%', label: '用户满意度' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-purple-50 py-20">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700">
              <Zap className="mr-2 h-4 w-4" />
              AI 驱动的爆款内容创作平台
            </div>
            <h1 className="mb-6 text-5xl font-bold text-gray-900 sm:text-6xl">
              低粉爆款对标 + AI 批量创作
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
                一键发公众号
              </span>
            </h1>
            <p className="mb-8 text-xl text-gray-600">
              帮助自媒体人快速出文、追热点、做账号矩阵
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/smart-writing">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700">
                  <PenTool className="mr-2 h-5 w-5" />
                  立即体验智能生文
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/daily-hot">
                <Button size="lg" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  查看每日爆款
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mb-2 text-4xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">核心功能</h2>
            <p className="text-lg text-gray-600">一站式解决自媒体内容创作痛点</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-2 border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color}`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">覆盖赛道</h2>
            <p className="text-lg text-gray-600">多领域内容创作，满足不同需求</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <div
                key={category}
                className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-100 to-purple-100 px-6 py-3 text-sm font-medium text-gray-700 hover:from-orange-200 hover:to-purple-200 transition-all duration-300 cursor-pointer"
              >
                <Star className="mr-2 h-4 w-4 text-orange-500" />
                {category}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-orange-50">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">核心优势</h2>
            <p className="text-lg text-gray-600">为什么选择爆了么</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {advantages.map((advantage) => (
              <Card key={advantage.title} className="border-0 bg-white/50 backdrop-blur-sm hover:bg-white transition-all duration-300">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-orange-500">
                    <advantage.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{advantage.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {advantage.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-purple-50">
            <CardContent className="py-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">
                开始您的爆款创作之旅
              </h2>
              <p className="mb-8 text-lg text-gray-600">
                适合个人博主、矩阵号、副业变现批量做号
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/smart-writing">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700">
                    <PenTool className="mr-2 h-5 w-5" />
                    立即开始创作
                  </Button>
                </Link>
                <Link href="/official-account">
                  <Button size="lg" variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                    <UserCheck className="mr-2 h-5 w-5" />
                    绑定公众号
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
