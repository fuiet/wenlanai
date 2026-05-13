'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      // 检查响应类型是否为 JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setError('服务器响应异常，请稍后重试');
        console.error('API 返回非 JSON 响应:', contentType);
        return;
      }

      const data = await res.json();

      if (data.success) {
        // 更新全局状态
        login(data.data.user);
        // 等待一小段时间确保 cookie 生效，然后跳转到首页
        setTimeout(() => {
          router.push('/');
        }, 100);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err: any) {
      console.error('登录错误:', err);
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('密码至少6位');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('两次密码不一致');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      // 检查响应类型是否为 JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setError('服务器响应异常，请稍后重试');
        console.error('API 返回非 JSON 响应:', contentType);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setMessage('注册成功，请登录');
        // 切换到登录模式
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || '注册失败');
      }
    } catch (err: any) {
      console.error('注册错误:', err);
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">文澜智作</h1>
          <p className="text-slate-500 mt-2">智能创作平台</p>
        </div>

        {/* Tab */}
        <div className="flex mb-6 bg-slate-200 rounded-lg p-1">
          <button
            onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            className={`flex-1 py-2 rounded-md font-medium transition-all ${
              mode === 'login' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); setMessage(''); }}
            className={`flex-1 py-2 rounded-md font-medium transition-all ${
              mode === 'register' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'
            }`}
          >
            注册
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="请输入密码"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="设置用户名（2-20个字符）"
                  minLength={2}
                  maxLength={20}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="设置密码（至少6位）"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  确认密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="再次输入密码"
                  minLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '注册中...' : '注册'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
