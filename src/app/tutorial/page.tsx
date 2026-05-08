'use client';

import { BookOpen, Zap, PenTool, LayoutTemplate, UserCheck, Crown, Lightbulb, ArrowRight, Star } from 'lucide-react';

const tutorials = [
  {
    icon: Zap,
    title: '每日爆款',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    steps: [
      { title: '浏览热门内容', desc: '查看各平台爆款文章，了解当前热点内容' },
      { title: '收藏感兴趣内容', desc: '点击收藏按钮，将优质内容保存到自己的收藏夹' },
      { title: '多源选择', desc: '支持微博热搜、微信热文、科技资讯等多个数据源' },
    ]
  },
  {
    icon: BookOpen,
    title: '提示词库',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    steps: [
      { title: '搜索提示词', desc: '输入关键词搜索相关提示词模板' },
      { title: '查看提示词详情', desc: '了解提示词的使用方法和适用场景' },
      { title: '收藏和复制', desc: '收藏常用提示词，一键复制到剪贴板使用' },
    ]
  },
  {
    icon: PenTool,
    title: '智能生文',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    steps: [
      { title: '选择赛道', desc: '选择感兴趣的创作领域（民生、科技、娱乐等）' },
      { title: '输入主题', desc: '输入文章主题或关键词，支持实时联网搜索最新信息' },
      { title: '生成文章', desc: 'AI根据主题自动生成完整文章，包含标题和配图' },
      { title: '保存文章', desc: '一键保存到文章库，随时查看和编辑' },
    ]
  },
  {
    icon: LayoutTemplate,
    title: '一键排版',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    steps: [
      { title: '选择或编辑文章', desc: '从文章库选择文章，或直接在编辑区输入内容' },
      { title: '设置样式', desc: '选择主题模板、调整字体、颜色、间距等排版参数' },
      { title: '实时预览', desc: '右侧手机模拟器实时预览排版效果' },
      { title: '同步滚动', desc: '编辑区和预览区同步滚动，方便对照调整' },
      { title: '推送到微信', desc: '排版完成后一键推送到公众号草稿箱' },
    ]
  },
  {
    icon: UserCheck,
    title: '公众号管理',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    steps: [
      { title: '授权公众号', desc: '在会员中心扫码授权你的微信公众号' },
      { title: '推送文章', desc: '从智能生文或排版页面直接推送到公众号草稿箱' },
      { title: '管理内容', desc: '在公众号后台完成编辑和发布' },
    ]
  },
  {
    icon: Crown,
    title: '会员中心',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    steps: [
      { title: '查看账号信息', desc: '了解账号等级、注册时间等基本信息' },
      { title: '修改密码', desc: '点击修改密码，更新登录密码' },
      { title: '数据统计', desc: '查看已创作的文章数量、提示词数量等' },
      { title: '设置赛道', desc: '选择感兴趣的创作领域，个性化推荐内容' },
    ]
  },
];

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Lightbulb className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">使用教程</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            文澜智作是一款专业的公众号内容创作工具，通过以下教程快速上手
          </p>
        </div>

        {/* 教程卡片 */}
        <div className="space-y-8">
          {tutorials.map((tutorial) => {
            const IconComponent = tutorial.icon;
            return (
              <div 
                key={tutorial.title}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* 卡片头部 */}
                <div className={`${tutorial.bgColor} px-6 py-4 flex items-center gap-4`}>
                  <div className={`${tutorial.color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{tutorial.title}</h2>
                </div>
                
                {/* 步骤列表 */}
                <div className="p-6">
                  <div className="grid gap-4">
                    {tutorial.steps.map((step, stepIndex) => (
                      <div 
                        key={stepIndex}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <span className={`text-sm font-bold ${tutorial.color}`}>
                            {stepIndex + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{step.title}</h3>
                          <p className="text-sm text-gray-600">{step.desc}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">小贴士</h3>
              <p className="text-sm text-gray-600">
                建议从「智能生文」开始创作，输入你感兴趣的主题，AI将为你生成完整文章。
                搭配「一键排版」功能，可以快速美化文章格式，提升阅读体验。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
