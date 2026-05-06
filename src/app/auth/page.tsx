'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/hooks/use-toast';
import { MessageCircle, QrCode, CheckCircle, XCircle, Mail, Smartphone, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // 微信扫码登录状态
  const [qrcodeUrl, setQrcodeUrl] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'waiting' | 'scanned' | 'confirmed' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('正在生成二维码...');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 邮箱注册状态
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerCode, setRegisterCode] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [sendCodeLoading, setSendCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isRegister, setIsRegister] = useState(false); // true=注册, false=登录
  
  // Tab切换
  const [activeTab, setActiveTab] = useState('wechat');

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

  // 生成二维码
  useEffect(() => {
    if (activeTab === 'wechat') {
      generateQrcode();
    }
  }, [refreshKey, activeTab]);

  // 轮询扫码状态
  useEffect(() => {
    if (!sessionId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/auth/wechat/callback?session=${sessionId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          setStatus('confirmed');
          setStatusMessage('登录成功！正在跳转...');
          toast({ title: '登录成功' });
          setTimeout(() => {
            router.push('/');
          }, 1000);
          return;
        }

        if (data.status === 'scanned') {
          setStatus('scanned');
          setStatusMessage('请在手机上确认登录');
        }

        if (data.status === 'expired') {
          setStatus('error');
          setStatusMessage('二维码已过期，请刷新重试');
        }
      } catch {
        // 继续轮询
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [sessionId, router, toast]);

  // 生成二维码
  const generateQrcode = async () => {
    try {
      setStatus('loading');
      setStatusMessage('正在生成二维码...');
      setQrcodeUrl('');
      setSessionId('');

      const res = await fetch('/api/auth/wechat/qrcode');
      const data = await res.json();

      if (data.success) {
        setQrcodeUrl(data.qrcodeUrl);
        setSessionId(data.sessionId);
        setStatus('waiting');
        setStatusMessage('请使用微信扫描二维码');
      } else {
        setStatus('error');
        setStatusMessage(data.message || '生成二维码失败');
      }
    } catch {
      setStatus('error');
      setStatusMessage('网络错误，请重试');
    }
  };

  // 刷新二维码
  const refreshQrcode = () => {
    setRefreshKey(prev => prev + 1);
  };

  // 发送邮箱验证码
  const sendEmailCode = async () => {
    if (!registerEmail) {
      toast({ title: '请输入邮箱地址', variant: 'destructive' });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      toast({ title: '邮箱格式不正确', variant: 'destructive' });
      return;
    }

    setSendCodeLoading(true);
    try {
      const res = await fetch('/api/email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerEmail, type: 'register' })
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: '验证码已发送到您的邮箱' });
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
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
      toast({ title: '网络错误', variant: 'destructive' });
    } finally {
      setSendCodeLoading(false);
    }
  };

  // 邮箱注册/登录
  const handleEmailAuth = async () => {
    if (!registerEmail || !registerPassword || !registerCode) {
      toast({ title: '请填写完整信息', variant: 'destructive' });
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
          password: registerPassword,
          confirmPassword: registerConfirmPassword,
          code: registerCode
        })
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: '注册成功！' });
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="wechat" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                微信登录
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                邮箱注册
              </TabsTrigger>
            </TabsList>

            {/* 微信扫码登录 */}
            <TabsContent value="wechat">
              <div className="flex flex-col items-center">
                <h2 className="text-lg font-semibold mb-6">微信扫码登录</h2>

                {/* 二维码区域 */}
                <div className="relative bg-white p-4 rounded-lg border-2 border-dashed border-gray-200 mb-6">
                  {qrcodeUrl ? (
                    <img
                      src={qrcodeUrl}
                      alt="登录二维码"
                      className="w-64 h-64"
                    />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-gray-300 animate-pulse" />
                    </div>
                  )}

                  {/* 状态遮罩 */}
                  {status !== 'waiting' && (
                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-lg">
                      {status === 'loading' && (
                        <>
                          <QrCode className="w-16 h-16 text-gray-400 animate-pulse mb-2" />
                          <p className="text-gray-500">{statusMessage}</p>
                        </>
                      )}
                      {status === 'scanned' && (
                        <>
                          <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                          <p className="text-green-600 font-medium">{statusMessage}</p>
                        </>
                      )}
                      {status === 'confirmed' && (
                        <>
                          <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                          <p className="text-green-600 font-medium">{statusMessage}</p>
                        </>
                      )}
                      {status === 'error' && (
                        <>
                          <XCircle className="w-16 h-16 text-red-500 mb-2" />
                          <p className="text-red-600">{statusMessage}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshQrcode}
                            className="mt-4"
                          >
                            刷新二维码
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 状态说明 */}
                <div className="text-center text-sm text-gray-500 mb-6">
                  {status === 'waiting' && <p>请使用微信扫描二维码登录</p>}
                  {status === 'scanned' && <p className="text-orange-500">请在微信中点击确认登录</p>}
                  {status === 'confirmed' && <p className="text-green-500">登录成功！</p>}
                </div>

                {/* 提示信息 */}
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 w-full">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">登录说明</p>
                      <ul className="mt-1 space-y-1 text-blue-600">
                        <li>1. 打开微信扫一扫</li>
                        <li>2. 扫描右侧二维码</li>
                        <li>3. 在手机上确认登录</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 刷新按钮 */}
                {status === 'waiting' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshQrcode}
                    className="mt-4"
                  >
                    刷新二维码
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* 邮箱注册 */}
            <TabsContent value="email">
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold">邮箱注册</h2>
                  <p className="text-sm text-gray-500 mt-1">输入邮箱和密码即可快速注册</p>
                </div>

                <div className="space-y-4">
                  {/* 邮箱 */}
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱地址</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="请输入邮箱"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={sendEmailCode}
                        disabled={countdown > 0 || sendCodeLoading}
                        className="whitespace-nowrap"
                      >
                        {sendCodeLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : countdown > 0 ? (
                          `${countdown}s`
                        ) : (
                          '获取验证码'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 验证码 */}
                  <div className="space-y-2">
                    <Label htmlFor="code">验证码</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="请输入验证码"
                      value={registerCode}
                      onChange={(e) => setRegisterCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>

                  {/* 密码 */}
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

                  {/* 确认密码 */}
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

                  {/* 注册按钮 */}
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

                  {/* 提示 */}
                  <p className="text-xs text-gray-500 text-center">
                    登录即表示同意<a href="#" className="text-orange-500">《用户协议》</a>和<a href="#" className="text-orange-500">《隐私政策》</a>
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
