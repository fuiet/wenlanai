'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Zap, 
  BookOpen, 
  PenTool, 
  LayoutTemplate, 
  UserCheck,
  Book,
  Mail,
  Crown
} from 'lucide-react';

const navItems = [
  { href: '/daily-hot', label: '每日爆款', icon: Zap },
  { href: '/prompt-library', label: '提示词库', icon: BookOpen },
  { href: '/smart-writing', label: '智能生文', icon: PenTool },
  { href: '/format-article', label: '一键排版', icon: LayoutTemplate },
  { href: '/official-account', label: '公众号', icon: UserCheck },
  { href: '/tutorial', label: '使用教程', icon: Book },
  { href: '/contact', label: '联系我们', icon: Mail },
  { href: '/membership', label: '会员中心', icon: Crown },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900">爆了么</span>
              <span className="text-xs text-gray-500">自媒体爆款智能创作系统</span>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isPrimaryPage = ['每日爆款', '提示词库', '智能生文', '一键排版', '公众号'].includes(item.label);
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive && isPrimaryPage ? 'default' : 'ghost'}
                    className={`
                      ${isActive && isPrimaryPage ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-gray-700 hover:text-orange-500 hover:bg-orange-50'}
                      transition-all duration-200
                    `}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 border-2 border-orange-200">
              <AvatarImage src="/avatar-placeholder.png" alt="用户头像" />
              <AvatarFallback className="bg-purple-500 text-white">用户</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">体验</span>
              <span className="text-xs text-red-500">已过期</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
