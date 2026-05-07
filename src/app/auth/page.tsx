'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('1065098865@qq.com');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [loginLoading, setLoginLoading] = useState(false);

  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast({ title: '请填写邮箱和密码' });
      return;
    }

    setLoginLoading(true);
    try {
      console.log('[Login] 开始登录:', loginEmail);
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      console.log('[Login] 响应状态:', res.status);
      const data = await res.json();
      console.log('[Login] 响应数据:', JSON.stringify(data));

      if (data.success) {
        console.log('[Login] 登录成功!');
        toast({ title: '登录成功！' });
        
        // 保存到 localStorage
        const userData = data.data?.user || {};
        localStorage.setItem('member_user', JSON.stringify(userData));
        console.log('[Login] 已保存用户数据到 localStorage');
        
        // 跳转到会员中心
        console.log('[Login] 准备跳转到 /member');
        router.push('/member');
      } else {
        console.log('[Login] 登录失败:', data.error);
        toast({ title: data.error || '登录失败' });
      }
    } catch (error) {
      console.error('[Login] 网络错误:', error);
      toast({ title: '网络错误' });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerEmail || !registerUsername || !registerPassword || !registerConfirmPassword) {
      toast({ title: '请填写完整信息' });
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast({ title: '两次密码不一致' });
      return;
    }

    if (registerPassword.length < 6) {
      toast({ title: '密码至少6位' });
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await fetch('/api/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: registerEmail,
          username: registerUsername,
          password: registerPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: '注册成功！' });
        // 注册成功后跳转到会员中心
        router.push('/member');
      } else {
        toast({ title: data.error || '注册失败' });
      }
    } catch {
      toast({ title: '网络错误' });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">会员登录</CardTitle>
          <CardDescription>加入文澜智作，开始智能创作</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="请输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-email">邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-username">用户名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="请输入用户名"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="请输入密码"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-confirm">确认密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="请再次输入密码"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={handleRegister}
                disabled={registerLoading}
              >
                {registerLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  '注册'
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
