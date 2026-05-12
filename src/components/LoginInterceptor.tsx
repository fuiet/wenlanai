'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock } from 'lucide-react';

// 全局状态管理
let isDialogOpenGlobal = false;
const dialogListeners: Set<(isOpen: boolean) => void> = new Set();

export function showLoginDialog() {
  isDialogOpenGlobal = true;
  dialogListeners.forEach(listener => listener(true));
}

export function hideLoginDialog() {
  isDialogOpenGlobal = false;
  dialogListeners.forEach(listener => listener(false));
}

// 登录拦截器组件
export default function LoginInterceptor() {
  const { user } = useAuth();

  useEffect(() => {
    // 检查用户是否已登录（优先使用user状态，也检查localStorage作为后备）
    let hasToken = false;
    try {
      hasToken = !!localStorage.getItem('session_token');
    } catch {
      // localStorage 访问被拒绝时忽略
    }
    const isLoggedIn = user || hasToken;
    
    // 已登录用户不需要拦截
    if (isLoggedIn) return;

    const handleClick = (e: MouseEvent) => {
      // 如果对话框已经打开，不再拦截
      if (isDialogOpenGlobal) return;

      const target = e.target as HTMLElement;
      
      // 排除导航栏区域 (nav 标签及其内部元素)
      const navBar = target.closest('nav');
      if (navBar) return;

      // 排除登录/注册页面本身
      const currentPath = window.location.pathname;
      if (currentPath === '/auth' || currentPath === '/login') return;

      // 排除已经是对话框内的元素
      const dialog = target.closest('[role="dialog"]');
      if (dialog) return;

      // 排除Toast提示
      const toast = target.closest('[class*="toast"], [class*="Toaster"]');
      if (toast) return;

      // 排除删除等操作按钮
      const actionBtn = target.closest('[data-action]');
      if (actionBtn) return;

      // 检查是否点击了可交互元素
      const interactiveElement = target.closest(
        'button, a, [role="button"], input:not([type="hidden"]), select, textarea, ' +
        '[tabindex]:not([tabindex="-1"]), label:not([for]), ' +
        '[data-clickable], .clickable, [style*="cursor: pointer"]'
      );

      if (interactiveElement) {
        // 排除 href 为 # 或 javascript:void(0) 的链接
        const anchor = interactiveElement as HTMLAnchorElement;
        const href = anchor.getAttribute('href');
        if (href === '#' || href === 'javascript:void(0)' || href === 'javascript:;') {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        showLoginDialog();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [user]);

  return null;
}

// 登录提示对话框组件
export function LoginRequiredDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleOpen = (isDialogOpen: boolean) => {
      setIsOpen(isDialogOpen);
    };

    dialogListeners.add(handleOpen);
    return () => {
      dialogListeners.delete(handleOpen);
    };
  }, []);

  const handleClose = () => {
    hideLoginDialog();
  };

  const handleLogin = () => {
    handleClose();
    router.push('/auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-orange-500" />
            请先登录
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground text-center">
            请先登录后再使用此功能
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleLogin}>
            去登录
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
