'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

// 需要检查登录的操作类型
export type ProtectedAction = 
  | 'generate'      // 生成文章
  | 'publish'       // 发布/推送
  | 'save'          // 保存
  | 'delete'        // 删除
  | 'edit'          // 编辑
  | 'analyze'       // 分析
  | 'bind'          // 绑定账号
  | 'import';       // 导入数据

// 操作对应的中文提示
const actionMessages: Record<ProtectedAction, string> = {
  generate: '生成文章',
  publish: '发布内容',
  save: '保存数据',
  delete: '删除数据',
  edit: '编辑内容',
  analyze: '分析数据',
  bind: '绑定账号',
  import: '导入数据',
};

interface LoginCheckResult {
  allowed: boolean;
  showLoginModal?: boolean;
}

// 检查是否需要登录的操作
export function useLoginCheck() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const checkLogin = (action: ProtectedAction): LoginCheckResult => {
    if (!isAuthenticated) {
      toast({
        title: '请先登录',
        description: `登录后才能${actionMessages[action]}哦~`,
        variant: 'destructive',
        duration: 3000,
      });
      return { allowed: false };
    }
    return { allowed: true };
  };

  return { checkLogin, isAuthenticated };
}

// 登录检查HOC - 用于包装需要登录的操作按钮
export function withLoginCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  action: ProtectedAction
) {
  return function WithLoginCheckComponent(props: P) {
    const { checkLogin, isAuthenticated } = useLoginCheck();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
      // 检查当前路径是否需要保护
      const pathname = window.location.pathname;
      const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
      if (isProtectedPath && !isAuthenticated) {
        // 未登录，显示提示
        // 不渲染组件
      } else {
        setShouldRender(true);
      }
    }, [isAuthenticated]);

    if (!shouldRender) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
