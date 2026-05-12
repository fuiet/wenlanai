'use client';

import { useRouter } from 'next/navigation';

interface LoginPromptProps {
  message?: string;
  onClose?: () => void;
}

export function LoginPrompt({ 
  message = '该功能需要登录后才能使用', 
  onClose 
}: LoginPromptProps) {
  const router = useRouter();

  const handleLogin = () => {
    // 保存当前路径，登录后可以跳转回来
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    }
    router.push('/auth');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">请先登录</h3>
          <p className="text-slate-500 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleLogin}
              className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              去登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 用于包装需要登录的功能按钮
interface RequireLoginButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function RequireLoginButton({ children, onClick, className = '' }: RequireLoginButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== 'undefined') {
      try {
        const user = localStorage.getItem('user');
        if (!user) {
          try {
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
          } catch {
            // sessionStorage 访问被拒绝时忽略
          }
          router.push('/auth');
          return;
        }
      } catch {
        // localStorage 访问被拒绝时，直接跳转到登录页
        router.push('/auth');
        return;
      }
    }
    onClick?.();
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
