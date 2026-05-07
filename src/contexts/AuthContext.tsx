'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string | null;
  phone?: string;
  vipLevel?: number;
  vipExpireAt?: string | null;
  points?: number;
  gender?: string;
  birthday?: string;
  bio?: string;
  company?: string;
  position?: string;
  website?: string;
  wechat?: string;
  qq?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false); // 改为 false，默认不显示 loading
  const router = useRouter();

  // 检查登录状态
  const checkAuth = async (): Promise<boolean> => {
    try {
      // 先尝试从 localStorage 获取（同步优先）
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('member_user');
        if (cached) {
          try {
            const userData = JSON.parse(cached);
            if (userData && userData.id) {
              setUser(userData);
              // 后台刷新用户信息（不阻塞）
              refreshUserInfo().catch(() => {});
              return true;
            }
          } catch {
            // 解析失败
          }
        }
      }
      
      // 如果没有缓存，尝试从 cookie 获取（用于服务端渲染）
      return false;
    } catch {
      return false;
    }
  };

  // 后台刷新用户信息
  const refreshUserInfo = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch('/api/member/profile', {
        credentials: 'include',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (data.success && data.data) {
        const userData = data.data;
        setUser(userData);
        localStorage.setItem('member_user', JSON.stringify(userData));
      }
    } catch {
      // 忽略错误，保持 localStorage 中的数据
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    await refreshUserInfo();
  };

  useEffect(() => {
    // 组件挂载时检查登录状态
    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('member_user', JSON.stringify(userData));
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/member/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // 忽略错误
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('member_user');
    }
    router.push('/auth');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
