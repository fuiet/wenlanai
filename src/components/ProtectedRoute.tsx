'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// 需要登录才能访问的页面
const protectedPaths = [
  '/smart-writing',
  '/daily-hot',
  '/format-article',
  '/prompt-crafting',
  '/prompt-library',
  '/official-account',
  '/account',
];

// 登录页面路径
const authPath = '/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
    const isAuthPath = pathname.startsWith(authPath);

    // 如果是受保护的页面但未登录，重定向到登录页
    if (isProtectedPath && !isAuthenticated) {
      // 保存当前路径，登录后可以跳转回来
      sessionStorage.setItem('redirectAfterLogin', pathname);
      router.push(authPath);
      return;
    }

    // 如果已登录且在登录页，重定向到首页
    if (isAuthPath && isAuthenticated) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // 加载中显示 loading
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // 未登录且在受保护页面，显示 loading（会重定向）
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  if (isProtectedPath && !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return <>{children}</>;
}
