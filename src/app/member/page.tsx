'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  '汽车', '民生', '星座情感', '科技数码', '财经理财', '职场干货'
];

const VIP_NAMES: Record<number, string> = {
  1: '普通会员',
  2: '高级会员',
  3: 'VIP会员'
};

export default function MemberPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 修改密码表单
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', msg: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 兴趣赛道
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoriesSaved, setCategoriesSaved] = useState(false);

  // 加载用户数据
  useEffect(() => {
    console.log('[Member] 组件加载, user:', user);
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/member/profile', { 
        credentials: 'include' 
      });
      const data = await res.json();
      console.log('[Member] profile data:', data);
      if (data.success && data.data) {
        setProfile(data.data);
        setSelectedCategories(data.data.categories || []);
      }
    } catch (err) {
      console.error('[Member] 加载失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ type: '', msg: '' });

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', msg: '新密码至少6位' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', msg: '两次密码不一致' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: 'success', msg: '密码修改成功' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', msg: data.error || '修改失败' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', msg: '网络错误' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveCategories = async () => {
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categories: selectedCategories })
      });
      const data = await res.json();
      if (data.success) {
        setCategoriesSaved(true);
        setTimeout(() => setCategoriesSaved(false), 2000);
      }
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/member/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
    } catch (err) {
      console.error('退出失败:', err);
    }
    logout();
    router.push('/');
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <h1 className="text-2xl font-bold text-slate-800 mb-6">会员中心</h1>

          <div className="flex flex-col md:flex-row gap-6">
            {/* 左侧菜单 */}
            <div className="w-full md:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <p className="font-semibold text-slate-800">{profile?.username || '用户'}</p>
                  <p className="text-sm text-slate-500">{VIP_NAMES[profile?.vipLevel || 1]}</p>
                </div>
                
                <nav className="space-y-1">
                  <button className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium">
                    账号信息
                  </button>
                  <button 
                    onClick={() => document.getElementById('password-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    修改密码
                  </button>
                  <button 
                    onClick={() => document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    创作数据
                  </button>
                  <button 
                    onClick={() => document.getElementById('settings-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    账号设置
                  </button>
                </nav>

                <div className="mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    退出登录
                  </Button>
                </div>
              </div>
            </div>

            {/* 右侧内容 */}
            <div className="flex-1 space-y-6">
              {/* 账号信息 */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">账号信息</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">用户名</span>
                    <span className="text-slate-800 font-medium">{profile?.username || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">注册时间</span>
                    <span className="text-slate-800">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('zh-CN') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">账号等级</span>
                    <span className="text-slate-800">{VIP_NAMES[profile?.vipLevel || 1]}</span>
                  </div>
                </div>
              </div>

              {/* 修改密码 */}
              <div id="password-section" className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">修改密码</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">旧密码</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">新密码</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">确认新密码</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {passwordMsg.msg && (
                    <p className={passwordMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {passwordMsg.msg}
                    </p>
                  )}
                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? '提交中...' : '修改密码'}
                  </Button>
                </form>
              </div>

              {/* 创作数据 */}
              <div id="stats-section" className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">创作数据概览</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">{profile?.stats?.articleCount || 0}</p>
                    <p className="text-sm text-slate-600">我的文章</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <p className="text-2xl font-bold text-purple-600">{profile?.stats?.promptCount || 0}</p>
                    <p className="text-sm text-slate-600">我的提示词</p>
                  </div>
                  <div className="text-center p-4 bg-pink-50 rounded-xl">
                    <p className="text-2xl font-bold text-pink-600">{profile?.stats?.favoriteCount || 0}</p>
                    <p className="text-sm text-slate-600">收藏爆款</p>
                  </div>
                </div>
              </div>

              {/* 账号设置 */}
              <div id="settings-section" className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">创作赛道设置</h2>
                <p className="text-sm text-slate-500 mb-4">选择你感兴趣的创作领域</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${
                        selectedCategories.includes(cat)
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Button onClick={handleSaveCategories}>
                    保存设置
                  </Button>
                  {categoriesSaved && (
                    <span className="text-green-600 text-sm">保存成功</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
