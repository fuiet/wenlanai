'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const USERNAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,20}$/;

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: '较弱', width: '25%', color: 'bg-red-500' };
  if (score <= 3) return { label: '中等', width: '55%', color: 'bg-amber-500' };
  return { label: '较强', width: '100%', color: 'bg-emerald-500' };
}

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const router = useRouter();
  const { login } = useAuth();
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const resetFeedback = () => {
    setError('');
    setMessage('');
  };

  const validateUsername = () => {
    if (!USERNAME_PATTERN.test(username.trim())) {
      setError('用户名需为2-20位中文、英文、数字、下划线或短横线');
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!validateUsername()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });

      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('无法解析响应:', responseText.substring(0, 200));
        setError('服务器响应异常，请稍后重试');
        return;
      }

      if (data.success) {
        if (data.data?.user?.id) {
          localStorage.setItem('user_id', data.data.user.id.toString());
        }
        login(data.data.user);
        setMessage('登录成功，正在进入工作台...');
        setTimeout(() => router.push('/'), 100);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err: unknown) {
      console.error('登录错误:', err);
      setError((err instanceof Error ? err.message : String(err)) || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!validateUsername()) return;

    if (password.length < 8) {
      setError('密码至少8位，建议包含大小写字母、数字或符号');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });

      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('无法解析响应:', responseText.substring(0, 200));
        setError('服务器响应异常，请稍后重试');
        return;
      }

      if (data.success) {
        setMessage('注册成功，请使用新账号登录');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || '注册失败');
      }
    } catch (err: unknown) {
      console.error('注册错误:', err);
      setError((err instanceof Error ? err.message : String(err)) || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)]">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            文澜智作 · 安全创作工作台
          </div>
          <h1 className="mb-5 text-5xl font-bold tracking-tight text-slate-950">
            登录后管理内容、模板与公众号资产
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-8 text-slate-600">
            每个账号拥有独立会话与独立数据空间。公众号绑定、文章素材和偏好设置会严格按登录用户隔离。
          </p>
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            {[
              { title: '独立账号空间', desc: '绑定的公众号仅当前用户可见。' },
              { title: '安全会话', desc: 'HttpOnly Cookie 保存登录态。' },
              { title: '密码保护', desc: '新账号使用强哈希存储密码。' },
              { title: '创作闭环', desc: '登录后可直达公众号推送流程。' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
                <ShieldCheck className="mb-3 h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md border-white/80 bg-white/90 shadow-2xl shadow-blue-100/60 backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-950">文澜智作</CardTitle>
              <CardDescription className="mt-2">登录您的智能创作平台账号</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(value) => { setMode(value as 'login' | 'register'); resetFeedback(); }} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>
            </Tabs>

            {message && (
              <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-800">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    placeholder="2-20位用户名"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-9"
                    placeholder={mode === 'login' ? '请输入密码' : '至少8位密码'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>密码强度</span>
                      <span>{passwordStrength.label}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: passwordStrength.width }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">确认密码</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入密码"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </>
              )}

              <Button type="submit" disabled={loading} className="h-11 w-full text-base">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? (mode === 'login' ? '登录中...' : '注册中...') : (mode === 'login' ? '安全登录' : '创建账号')}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-slate-500">
              登录即表示您同意使用安全会话保存登录状态；请勿与他人共享账号或公众号密钥。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
