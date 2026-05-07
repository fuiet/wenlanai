'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { LogOut, User, Mail, Crown } from 'lucide-react';

export default function MemberCenterPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    console.log('[Member] 页面加载，开始获取用户信息');
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      console.log('[Member] 发送请求到 /api/member/profile');
      const res = await fetch('/api/member/profile', {
        credentials: 'include'
      });
      console.log('[Member] 响应状态:', res.status);
      const data = await res.json();
      console.log('[Member] 响应数据:', JSON.stringify(data));
      
      if (data.success && data.data) {
        console.log('[Member] 登录成功，设置用户');
        setUser(data.data);
      } else {
        console.log('[Member] 未登录，跳转到登录页');
        toast({ title: '请先登录' });
        router.push('/auth');
      }
    } catch (error) {
      console.error('[Member] 加载失败:', error);
      toast({ title: '加载失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/member/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch {}
    setUser(null);
    localStorage.removeItem('member_user');
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>提示</CardTitle>
            <CardDescription>正在跳转到登录页面...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto">
                <User className="w-12 h-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">{user.nickname || user.username || '用户'}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">
                {user.vipLevel === 1 ? '普通会员' : user.vipLevel === 2 ? '高级会员' : 'VIP会员'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">邮箱</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              {user.username && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">用户名</p>
                    <p className="font-medium">{user.username}</p>
                  </div>
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
