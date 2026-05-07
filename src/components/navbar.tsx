'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  Crown,
  LogIn,
  User,
  LogOut
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { href: '/daily-hot', label: '每日爆款', icon: Zap },
  { href: '/prompt-library', label: '提示词库', icon: BookOpen },
  { href: '/smart-writing', label: '智能生文', icon: PenTool },
  { href: '/format-article', label: '一键排版', icon: LayoutTemplate },
  { href: '/official-account', label: '公众号', icon: UserCheck },
  { href: '/member', label: '会员中心', icon: Crown },
];

interface UserInfo {
  id: string;
  email: string;
  username: string;
  nickname: string;
  avatar?: string;
  vip_level?: number;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const res = await fetch('/api/member/profile');
      const data = await res.json();
      if (data.success && data.profile) {
        setUser(data.profile);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/member/logout', { method: 'POST' });
      setUser(null);
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <PenTool className="h-7 w-7 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-900">文澜智作</span>
              <span className="text-xs text-gray-500">自媒体爆款智能创作系统</span>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isPrimaryPage = true;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive && isPrimaryPage ? 'default' : 'ghost'}
                    size="sm"
                    className={`
                      ${isActive && isPrimaryPage ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-gray-700 hover:text-orange-500 hover:bg-orange-50'}
                      transition-all duration-200
                    `}
                  >
                    <Icon className="mr-1.5 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            {!loading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2 hover:bg-orange-50">
                        <Avatar className="h-9 w-9 border-2 border-orange-200">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-purple-500 text-white">
                            {user.username?.[0]?.toUpperCase() || user.nickname?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-700">{user.nickname || user.username || '用户'}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/member" className="flex items-center">
                          <Crown className="mr-2 h-4 w-4" />
                          会员中心
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        退出登录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/auth">
                    <Button className="bg-orange-500 hover:bg-orange-600">
                      <LogIn className="mr-2 h-4 w-4" />
                      登录 / 注册
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
