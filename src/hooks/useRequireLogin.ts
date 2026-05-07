'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function useRequireLogin() {
  const { user } = useAuth();
  const router = useRouter();
  
  const checkLogin = useCallback(() => {
    if (!user) {
      router.push('/auth');
      return false;
    }
    return true;
  }, [user, router]);
  
  const requireLogin = useCallback(() => {
    if (!user) {
      router.push('/auth');
      return false;
    }
    return true;
  }, [user, router]);
  
  return { checkLogin, requireLogin, isLoggedIn: !!user };
}
