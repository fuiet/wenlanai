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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 检查登录状态
  const checkAuth = async (): Promise<boolean> => {
    try {
      // 先尝试从 localStorage 获取
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('member_user');
        if (cached) {
          try {
            const userData = JSON.parse(cached);
            setUser(userData);
            return true;
          } catch {
            // 解析失败，继续检查 API
          }
        }
      }
      
      // 如果没有缓存，调用API（添加 credentials 确保发送 cookie）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      try {
        const res = await fetch('/api/member/profile', {
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await res.json();
        if (data.success && data.data) {
          // API 返回的 data.data 就是用户信息
          const userData = data.data;
          setUser(userData);
          localStorage.setItem('member_user', JSON.stringify(userData));
          return true;
        } else {
          setUser(null);
          localStorage.removeItem('member_user');
          return false;
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.log('检查登录状态超时');
        }
        throw fetchError;
      }
    } catch {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('member_user');
      }
      return false;
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    await checkAuth();
  };

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
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
    localStorage.removeItem('member_user');
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
