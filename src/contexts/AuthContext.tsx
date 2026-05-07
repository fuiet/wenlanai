'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar_url?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 检查登录状态
  const checkAuth = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login');
      const data = await res.json();
      if (data.loggedIn && data.user) {
        setUser({
          id: data.user.id,
          phone: data.user.phone,
          nickname: data.user.nickname,
          avatar_url: data.user.avatar_url,
          email: data.user.email,
        });
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch {
      setUser(null);
      return false;
    }
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
      await fetch('/api/auth/logout', { method: 'POST' });
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
