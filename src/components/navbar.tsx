'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Zap,
  BookOpen,
  PenTool,
  LayoutTemplate,
  UserCheck,
  Crown,
  LogIn,
  LogOut,
  BookText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { href: '/daily-hot', label: '每日爆款', icon: Zap },
  { href: '/prompt-library', label: '提示词库', icon: BookOpen },
  { href: '/smart-writing', label: '智能生文', icon: PenTool },
  { href: '/format-article', label: '一键排版', icon: LayoutTemplate },
  { href: '/official-account', label: '公众号', icon: UserCheck },
  { href: '/tutorial', label: '使用教程', icon: BookText },
  { href: '/member', label: '会员中心', icon: Crown },
];

const vipLevelMap: Record<number, string> = {
  1: '普通会员',
  2: '高级会员',
  3: 'VIP会员'
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // 获取VIP等级名称
  const getVipName = (level?: number) => {
    return vipLevelMap[level || 1] || '普通会员';
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between w-full">
          {/* Logo - 最左边 */}
          <Link href="/" className="flex items-center space-x-2 mr-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">文</span>
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">文澜智作</span>
          </Link>

          {/* 中间导航 */}
          <div className="hidden lg:flex items-center space-x-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* 右侧：用户操作 */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors ml-auto">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-sm">
                      {user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-800">
                      你好，{user.username}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getVipName(user.vipLevel)}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/member')}>
                  <Crown className="w-4 h-4 mr-2" />
                  会员中心
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2 ml-auto">
              <Link
                href="/auth"
                className="flex items-center space-x-1 px-3 py-1.5 text-slate-600 hover:text-slate-800 text-sm font-medium"
              >
                <LogIn className="w-4 h-4" />
                <span>登录</span>
              </Link>
              <Link
                href="/auth"
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
