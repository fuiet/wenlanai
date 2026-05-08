'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useLoginCheck() {
  const { user } = useAuth();
  
  const checkLogin = useCallback(() => {
    if (!user) {
      return false;
    }
    return true;
  }, [user]);
  
  return { isLoggedIn: !!user, checkLogin };
}
