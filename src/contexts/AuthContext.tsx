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
      const cached = localStorage.getItem('member_user');
      if (cached) {
        const userData = JSON.parse(cached);
        setUser(userData);
        return true;
      }
      // 如果没有缓存，调用API
      const res = await fetch('/api/member/profile');
      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data.user);
        localStorage.setItem('member_user', JSON.stringify(data.data.user));
        return true;
      } else {
        setUser(null);
        localStorage.removeItem('member_user');
        return false;
      }
    } catch {
      setUser(null);
      localStorage.removeItem('member_user');
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
      await fetch('/api/member/logout', { method: 'POST' });
    } catch {
      // 忽略错误
    }
    setUser(null);
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
