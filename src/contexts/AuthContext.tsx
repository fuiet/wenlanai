'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  nickname?: string;
  vipLevel?: number;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 检查登录状态
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/member/profile', {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success && data.data) {
        setUser({
          id: data.data.id,
          username: data.data.username,
          nickname: data.data.nickname || data.data.username,
          vipLevel: data.data.vipLevel || 1,
          email: data.data.email
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化时检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  // 登录
  const login = (userData: User) => {
    const userInfo = {
      id: userData.id,
      username: userData.username,
      nickname: userData.nickname || userData.username,
      vipLevel: userData.vipLevel || 1
    };
    setUser(userInfo);
    localStorage.setItem('user', JSON.stringify(userInfo));
  };

  // 退出登录
  const logout = async () => {
    try {
      await fetch('/api/member/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('退出登录失败:', err);
    }
    setUser(null);
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
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
