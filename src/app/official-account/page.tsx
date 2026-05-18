'use client';

import { useEffect, useState, useCallback } from 'react';

interface WechatAccount {
  id: number;
  app_id: string;
  nick_name: string;
  head_img: string;
  is_authorized: boolean;
  created_at: string;
}

export default function OfficialAccountPage() {
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 加载公众号列表
  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/wechat-auth/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
      }
    } catch (e) {
      console.error('加载公众号列表失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取授权二维码
  const getAuthUrl = async () => {
    setError('');
    setSuccessMsg('');
    
    try {
      // 从localStorage获取用户ID
      const userId = localStorage.getItem('user_id') || 'anonymous';
      
      const res = await fetch(`/api/wechat/auth-url-proxy?user_id=${userId}`);
      const data = await res.json();
      
      if (data.auth_url) {
        // 生成二维码
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.auth_url)}`;
        setQrCodeUrl(qrUrl);
      } else {
        setError(data.error || '获取授权链接失败');
      }
    } catch (e) {
      setError('网络错误，请重试');
    }
  };

  // 监听授权成功消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'wechat_auth_success') {
        setSuccessMsg('公众号授权成功！');
        setQrCodeUrl('');
        // 刷新列表
        loadAccounts();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadAccounts]);

  // 初始加载
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">公众号管理</h1>
        
        {/* 成功提示 */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {successMsg}
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 授权区域 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">绑定公众号</h2>
          <button
            onClick={getAuthUrl}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
          >
            扫码授权
          </button>
          
          {qrCodeUrl && (
            <div className="mt-4">
              <p className="text-gray-600 mb-2">请使用公众号管理员微信扫码授权</p>
              <img src={qrCodeUrl} alt="授权二维码" className="border rounded" />
            </div>
          )}
        </div>

        {/* 公众号列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">已授权公众号</h2>
          
          {loading ? (
            <p className="text-gray-500">加载中...</p>
          ) : accounts.length === 0 ? (
            <p className="text-gray-500">暂无授权公众号</p>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center border rounded-lg p-4">
                  {account.head_img && (
                    <img src={account.head_img} alt="" className="w-12 h-12 rounded mr-4" />
                  )}
                  <div>
                    <p className="font-medium">{account.nick_name || '未命名'}</p>
                    <p className="text-sm text-gray-500">AppID: {account.app_id}</p>
                  </div>
                  <span className={`ml-auto px-2 py-1 text-xs rounded ${account.is_authorized ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {account.is_authorized ? '已授权' : '未授权'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
