'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// 操作对应的中文提示
const actionMessages: Record<string, string> = {
  create: '新建',
  edit: '编辑',
  delete: '删除',
  save: '保存',
  generate: '生成',
  publish: '发布',
  import: '导入',
  export: '导出',
  analyze: '分析',
  bind: '绑定',
  manage: '管理',
  refresh: '刷新',
  upload: '上传',
  download: '下载',
  default: '操作',
};

// 获取操作对应的中文提示
export function getActionMessage(action: string): string {
  return actionMessages[action] || '操作';
}

// 登录检查 Hook - 用于在组件中使用
export function useRequireLogin() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const checkLogin = (action: string = 'default'): boolean => {
    if (!isAuthenticated) {
      toast({
        title: '请先登录',
        description: `登录后才能进行${actionMessages[action] || '操作'}哦~`,
        variant: 'destructive',
        duration: 3000,
      });
      return false;
    }
    return true;
  };

  return { 
    isAuthenticated, 
    isLoading,
    checkLogin 
  };
}
