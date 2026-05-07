'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  User,
  Lock,
  BarChart3,
  Settings,
  LogOut,
  CheckCircle2,
  XCircle,
  Crown,
  FileText,
  MessageSquare,
  Heart
} from 'lucide-react';

const CATEGORIES = [
  '汽车', '民生', '星座情感', '科技数码', '财经理财', '职场干货'
];

const VIP_NAMES: Record<number, string> = {
  1: '普通会员',
  2: '高级会员',
  3: 'VIP会员'
};

interface ProfileData {
  id: string;
  username: string;
  email: string;
  nickname: string;
  createdAt: string;
  vipLevel: number;
  categories: string[];
  stats: {
    articleCount: number;
    promptCount: number;
    favoriteCount: number;
  };
}

export default function MemberPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'stats' | 'settings'>('info');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // 修改密码表单
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 兴趣赛道
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoriesSaved, setCategoriesSaved] = useState(false);

  // 未登录跳转
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // 获取用户资料
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/member/profile', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data);
        setSelectedCategories(data.data.categories || []);
      }
    } catch (err) {
      console.error('获取资料失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('新密码至少6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次密码不一致');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'changePassword',
          data: { oldPassword, newPassword, confirmPassword }
        })
      });

      const data = await res.json();

      if (data.success) {
        setPasswordSuccess('密码修改成功');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error);
      }
    } catch (err) {
      setPasswordError('网络错误');
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
        body: JSON.stringify({
          action: 'updateCategories',
          data: { categories: selectedCategories }
        })
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

  const handleLogout = () => {
    logout();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
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
                {/* 用户信息卡片 */}
                <div className="text-center pb-4 border-b border-slate-100 mb-4">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-xl">
                      {profile.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-slate-800">{profile.username}</h3>
                  <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    {VIP_NAMES[profile.vipLevel] || '普通会员'}
                  </p>
                </div>

                {/* 菜单项 */}
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'info'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    账号信息
                  </button>
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'password'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    修改密码
                  </button>
                  <button
                    onClick={() => setActiveTab('stats')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'stats'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    创作数据
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'settings'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    账号设置
                  </button>
                </nav>

                {/* 退出按钮 */}
                <button
                  onClick={handleLogout}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </div>

            {/* 右侧内容 */}
            <div className="flex-1">
              {/* 账号信息 */}
              {activeTab === 'info' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-6">账号信息</h2>
                  <div className="space-y-4">
                    <div className="flex items-center py-3 border-b border-slate-100">
                      <span className="w-24 text-slate-500">用户名</span>
                      <span className="text-slate-800 font-medium">{profile.username}</span>
                    </div>
                    <div className="flex items-center py-3 border-b border-slate-100">
                      <span className="w-24 text-slate-500">注册时间</span>
                      <span className="text-slate-800">{formatDate(profile.createdAt)}</span>
                    </div>
                    <div className="flex items-center py-3 border-b border-slate-100">
                      <span className="w-24 text-slate-500">账号等级</span>
                      <span className="text-slate-800 flex items-center gap-1">
                        <Crown className="w-4 h-4 text-amber-500" />
                        {VIP_NAMES[profile.vipLevel] || '普通会员'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 修改密码 */}
              {activeTab === 'password' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-6">修改密码</h2>

                  {passwordError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {passwordSuccess}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        旧密码
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="请输入旧密码"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        新密码
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="请输入新密码（至少6位）"
                        minLength={6}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        确认新密码
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="再次输入新密码"
                        minLength={6}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={passwordLoading}>
                      {passwordLoading ? '修改中...' : '修改密码'}
                    </Button>
                  </form>
                </div>
              )}

              {/* 创作数据 */}
              {activeTab === 'stats' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-6">创作数据概览</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-slate-600 text-sm">我的文章</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-800">
                        {profile.stats?.articleCount || 0}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">篇文章</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-slate-600 text-sm">我的提示词</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-800">
                        {profile.stats?.promptCount || 0}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">条提示词</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                          <Heart className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-slate-600 text-sm">收藏的爆款</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-800">
                        {profile.stats?.favoriteCount || 0}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">篇收藏</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 账号设置 */}
              {activeTab === 'settings' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-6">账号设置</h2>

                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">
                      选择感兴趣的创作赛道
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {CATEGORIES.map((category) => (
                        <label
                          key={category}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedCategories.includes(category)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, category]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== category));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleSaveCategories} disabled={categoriesSaved}>
                    {categoriesSaved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        已保存
                      </>
                    ) : (
                      '保存设置'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
