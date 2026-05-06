'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, Phone, Send, User, Shield } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();

  // 登录状态
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 注册状态
  const [regPhone, setRegPhone] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [sendCodeLoading, setSendCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState(''); // 开发环境显示验证码

  // 发送验证码
  const handleSendCode = async () => {
    if (!regPhone) {
      toast({ title: '请输入手机号', variant: 'destructive' });
      return;
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(regPhone)) {
      toast({ title: '手机号格式不正确', variant: 'destructive' });
      return;
    }

    setSendCodeLoading(true);
    try {
      const res = await fetch('/api/sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone })
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: '验证码已发送' });
        if (data.devCode) {
          setDevCode(data.devCode); // 开发环境显示验证码
        }
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast({ title: data.message || '发送失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '发送失败', variant: 'destructive' });
    } finally {
      setSendCodeLoading(false);
    }
  };

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regPhone || !regCode || !regPassword || !regConfirmPassword) {
      toast({ title: '请填写完整信息', variant: 'destructive' });
      return;
    }

    if (regPassword !== regConfirmPassword) {
      toast({ title: '两次密码不一致', variant: 'destructive' });
      return;
    }

    if (regPassword.length < 6) {
      toast({ title: '密码至少6位', variant: 'destructive' });
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: regPhone,
          smsCode: regCode,
          password: regPassword,
          confirmPassword: regConfirmPassword
        })
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: '注册成功' });
        router.push('/smart-writing');
      } else {
        toast({ title: data.message || '注册失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '注册失败', variant: 'destructive' });
    } finally {
      setRegLoading(false);
    }
  };

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginPhone || !loginPassword) {
      toast({ title: '请输入手机号和密码', variant: 'destructive' });
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword })
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: '登录成功' });
        router.push('/smart-writing');
      } else {
        toast({ title: data.message || '登录失败', variant: 'destructive' });
      }
    } catch {
      toast({ title: '登录失败', variant: 'destructive' });
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">文澜智作</CardTitle>
          <CardDescription>AI智能创作平台</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            {/* 登录表单 */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">手机号</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="请输入手机号"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? '登录中...' : '登录'}
                </Button>
              </form>
            </TabsContent>

            {/* 注册表单 */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">手机号</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="请输入手机号"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">验证码</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="请输入验证码"
                        value={regCode}
                        onChange={(e) => setRegCode(e.target.value)}
                        className="pl-10"
                        maxLength={6}
                      />
                      {devCode && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-500">
                          测试: {devCode}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || sendCodeLoading}
                      className="whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}秒` : sendCodeLoading ? '发送中...' : '获取验证码'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">设置密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="请输入密码（6-20位）"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">确认密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="请再次输入密码"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={regLoading}>
                  {regLoading ? '注册中...' : '注册'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-gray-500">
          <p>登录即表示同意<a href="#" className="text-blue-600 hover:underline">《用户协议》</a></p>
          <Link href="/" className="hover:text-blue-600">
            返回首页
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
