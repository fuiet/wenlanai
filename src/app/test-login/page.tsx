'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestPage() {
  const { user, isHydrated, logout, checkAuth } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // 收集调试信息
    setDebugInfo({
      localStorageUser: localStorage.getItem('user'),
      user: user,
      isHydrated: isHydrated
    });

    // 手动检查登录状态
    checkAuth().then(() => {
      setDebugInfo((prev: any) => ({
        ...prev,
        afterCheckAuth: true,
        userAfterCheck: localStorage.getItem('user')
      }));
    });
  }, []);

  const handleTestLogin = async () => {
    const res = await fetch('/api/member/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: 'testuser', password: '123456' })
    });
    const data = await res.json();
    alert(JSON.stringify(data, null, 2));
  };

  const handleTestProfile = async () => {
    const res = await fetch('/api/member/profile', {
      credentials: 'include'
    });
    const data = await res.json();
    alert(JSON.stringify(data, null, 2));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-bold mb-4">登录状态调试</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-semibold mb-2">当前状态</h2>
        <p><strong>Hydrated:</strong> {isHydrated ? '是' : '否'}</p>
        <p><strong>User:</strong> {user ? JSON.stringify(user) : 'null'}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-semibold mb-2">localStorage</h2>
        <pre className="bg-slate-100 p-2 rounded text-sm overflow-auto">
          {localStorage.getItem('user') || 'null'}
        </pre>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="font-semibold mb-2">Cookie</h2>
        <pre className="bg-slate-100 p-2 rounded text-sm overflow-auto">
          {document.cookie || 'null'}
        </pre>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleTestLogin}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          测试登录
        </button>
        <button
          onClick={handleTestProfile}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          测试获取Profile
        </button>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
