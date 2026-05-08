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

import { ChevronDown } from 'lucide-react';

export default function MemberPage() {
  const { user, logout, profile } = useAuth();
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', msg: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // 加载用户数据
  useEffect(() => {
    if (user) {
      setSelectedCategories(user.categories || []);
    }
  }, [user]);

  // 格式化日期
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // 修改密码
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
      const res = await fetch('/api/member/change-password', {
        method: 'POST',
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
    } catch {
      setPasswordMsg({ type: 'error', msg: '修改失败' });
    }
    setPasswordLoading(false);
  };

  // 保存兴趣赛道
  const saveCategories = async () => {
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categories: selectedCategories })
      });
      const data = await res.json();
      if (data.success) {
        alert('保存成功');
      }
    } catch {
      alert('保存失败');
    }
  };

  // 退出登录
  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <Button onClick={() => router.push('/auth')}>去登录</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">会员中心</h1>

        {/* 账号信息 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">账号信息</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">用户名</span>
              <span className="font-medium">{user.username || user.nickname || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">注册时间</span>
              <span className="font-medium">{formatDate(profile?.createdAt || user.createdAt)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">账号等级</span>
              <span className="font-medium">{VIP_NAMES[user.vipLevel || 1] || '普通会员'}</span>
            </div>
          </div>
          
          {/* 修改密码 - 可展开 */}
          <div className="mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${showPasswordForm ? 'rotate-180' : ''}`} />
              {showPasswordForm ? '收起修改密码' : '修改密码'}
            </button>
            
            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">旧密码</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="请输入旧密码"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">新密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="请输入新密码（至少6位）"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="请再次输入新密码"
                    required
                  />
                </div>
                {passwordMsg.msg && (
                  <p className={`text-sm ${passwordMsg.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                    {passwordMsg.msg}
                  </p>
                )}
                <Button type="submit" disabled={passwordLoading} size="sm">
                  {passwordLoading ? '修改中...' : '确认修改'}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* 兴趣赛道 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">兴趣赛道</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCategories([...selectedCategories, cat]);
                    } else {
                      setSelectedCategories(selectedCategories.filter(c => c !== cat));
                    }
                  }}
                  className="w-4 h-4 text-orange-500 rounded"
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
          <Button onClick={saveCategories}>保存设置</Button>
        </div>

        {/* 退出登录 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            退出登录
          </Button>
        </div>
      </div>
    </div>
  );
}
