'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
// 业务 API 使用相对路径

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
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const userData = JSON.parse(stored);
          setUser(userData);
        } catch (e) {
          console.error('解析用户数据失败:', e);
        }
      }
    } catch {
      // localStorage 访问被拒绝时忽略
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
      
      // 尝试解析响应为 JSON
      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('无法解析 profile 响应:', responseText.substring(0, 200));
        // 非 JSON 响应，可能是错误页面，不清除本地数据
        return;
      }

      if (data.success && data.data) {
        const userData = {
          id: data.data.id,
          username: data.data.username,
          nickname: data.data.nickname || data.data.username,
          vipLevel: data.data.vipLevel || 1,
          email: data.data.email
        };
        setUser(userData);
        try {
          localStorage.setItem('user', JSON.stringify(userData));
        } catch {
          // localStorage 访问被拒绝时忽略
        }
      } else {
        // API 返回失败
        // 检查本地是否有用户数据，如果有则保留（可能是刚登录，cookie还没生效）
        try {
          const stored = localStorage.getItem('user');
          if (!stored) {
            // 本地没有用户数据，才清除
            setUser(null);
          }
          // 如果本地有用户数据，保留它，等待下次 checkAuth 验证
        } catch {
          setUser(null);
        }
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
      // 网络错误时不清除本地数据，因为用户可能只是暂时离线
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化时检查登录状态（总是检查服务端session）
  useEffect(() => {
    // 每次页面加载都检查服务端session状态
    checkAuth();
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
    try {
      localStorage.setItem('user', JSON.stringify(userInfo));
    } catch {
      // localStorage 访问被拒绝时忽略
    }
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
      try {
        localStorage.removeItem('user');
      } catch {
        // localStorage 访问被拒绝时忽略
      }
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
