'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  nickname?: string;
  vipLevel?: number;
  email?: string;
  categories?: string[];
  createdAt?: string;
}

interface MemberProfile {
  id: string;
  userId: string;
  phone?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: MemberProfile | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();

  // 初始化时从 localStorage 读取用户数据
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setUser(userData);
      } catch (e) {
        console.error('解析用户数据失败:', e);
      }
    }
    setIsHydrated(true);
  }, []);

  // 检查登录状态（后台刷新）
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/member/profile', {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success && data.data) {
        const userData = {
          id: data.data.id,
          username: data.data.username,
          nickname: data.data.nickname || data.data.username,
          vipLevel: data.data.vipLevel || 1,
          email: data.data.email
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // API 返回失败，清除本地数据
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
      // 网络错误时不清除本地数据，因为用户可能只是暂时离线
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化时检查登录状态（只在有本地数据时）
  useEffect(() => {
    if (isHydrated && user) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

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
    } finally {
      setUser(null);
      setProfile(null);
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, isHydrated, login, logout, checkAuth }}>
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
