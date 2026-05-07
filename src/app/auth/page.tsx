'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const { toast } = useToast();
  
  // 登录状态
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // 邮箱注册状态
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // 检查登录状态
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // 检查是否已登录
  const checkLoginStatus = async () => {
    try {
      const res = await fetch('/api/auth/login');
      const data = await res.json();
      if (data.loggedIn) {
        router.push('/');
      }
    } catch {
      // 未登录，继续
    }
  };

  // 邮箱登录
  const handleEmailLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast({ title: '请填写邮箱和密码', variant: 'destructive' });
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: '登录成功！' });
        await checkAuth();
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        toast({ title: data.message || '登录失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '网络错误', variant: 'destructive' });
    } finally {
      setLoginLoading(false);
    }
  };

  // 邮箱注册
  const handleEmailAuth = async () => {
    if (!registerEmail || !registerUsername || !registerPassword || !registerConfirmPassword) {
      toast({ title: '请填写完整信息', description: '用户名、邮箱、密码都不能为空', variant: 'destructive' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      toast({ title: '邮箱格式不正确', variant: 'destructive' });
      return;
    }

    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(registerUsername)) {
      toast({ title: '用户名格式不正确', description: '用户名需2-20位，可包含中文、字母、数字和下划线', variant: 'destructive' });
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast({ title: '两次密码不一致', variant: 'destructive' });
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await fetch('/api/auth/email-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          username: registerUsername,
          password: registerPassword,
          confirmPassword: registerConfirmPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: '注册成功！' });
        await checkAuth();
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        toast({ title: data.message || '注册失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '网络错误', variant: 'destructive' });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">文澜智作</CardTitle>
          <CardDescription>AI自媒体爆款创作系统</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>
            
            {/* 登录表单 */}
            <TabsContent value="login">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">邮箱地址</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="请输入注册邮箱"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">密码</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="请输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                  />
                </div>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={handleEmailLogin}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  登录
                </Button>
              </div>
            </TabsContent>
            
            {/* 注册表单 */}
            <TabsContent value="register">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名（2-20位）"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="6-20位密码"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="再次输入密码"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={handleEmailAuth}
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  注册
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
