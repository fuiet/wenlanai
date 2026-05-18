'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserCheck, Plus, Trash2, Loader2, ExternalLink, CheckCircle, AlertCircle
} from 'lucide-react';

interface WechatAccount {
  id: number;
  app_id: string;
  authorizer_appid: string;
  nickname: string;
  head_img: string;
  user_name: string;
  alias: string;
  principal_type: string;
  verify_type_info: number;
  qrcode_url: string;
  is_authorized: boolean;
  created_at: string;
}

function OfficialAccountContent() {
  const searchParams = useSearchParams();
  const [defaultTab, setDefaultTab] = useState('accounts');
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setAccountsLoading(true);
    try {
      const response = await fetch('/api/wechat-auth/url');
      const result = await response.json();
      if (result.success) {
        setAccounts(result.accounts || []);
      }
    } catch (error) {
      console.error('加载账号失败:', error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const loadQrCode = async () => {
    setQrCodeLoading(true);
    setQrCodeError(null);
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('用户未登录，请先登录');
      const response = await fetch(`/api/pre_auth_code?user_id=${encodeURIComponent(userId)}`);
      const result = await response.json();
      if (result.auth_url) {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.auth_url)}`;
        setQrCodeUrl(qrCodeUrl);
      } else {
        setQrCodeError(result.error || '获取授权链接失败');
      }
    } catch (error: any) {
      console.error('获取授权二维码失败:', error);
      setQrCodeError(error.message || '请求失败');
    } finally {
      setQrCodeLoading(false);
    }
  };

  const handleDeleteAccount = async (appId: string) => {
    if (!confirm('确定要解绑该公众号吗？')) return;
    try {
      const response = await fetch(`/api/wechat-auth/account/${appId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setStatusMessage({ type: 'success', message: '解绑成功' });
        loadAccounts();
      } else {
        setStatusMessage({ type: 'error', message: result.message || '解绑失败' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', message: '解绑失败，请稍后重试' });
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'auth') setDefaultTab('auth');
    loadAccounts();
  }, [searchParams]);

  useEffect(() => {
    if (defaultTab === 'auth') {
      loadQrCode();
    }
  }, [defaultTab]);

  // 监听授权成功消息，刷新列表
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'wechat_bound') {
        loadAccounts();
        if (defaultTab !== 'accounts') setDefaultTab('accounts');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [defaultTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800">公众号管理</h1>
          <p className="text-slate-500 mt-2">一站式管理您的授权公众号，轻松推送内容</p>
        </div>

        {statusMessage && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="flex-1">{statusMessage.message}</span>
            <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}

        <Tabs value={defaultTab} onValueChange={setDefaultTab} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <TabsList className="bg-gray-50/50 p-1 rounded-none border-b border-gray-100">
            <TabsTrigger value="accounts" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2">
              <UserCheck className="h-4 w-4 mr-2" />已授权公众号 ({accounts.length})
            </TabsTrigger>
            <TabsTrigger value="auth" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2">
              <ExternalLink className="h-4 w-4 mr-2" />扫码授权
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-700">我的公众号</h2>
              <Button onClick={() => setDefaultTab('auth')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md rounded-full px-5">
                <Plus className="mr-2 h-4 w-4" />授权公众号
              </Button>
            </div>
            {accountsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">暂无授权公众号</p>
                <p className="text-sm text-gray-400 mt-1">点击上方按钮开始绑定</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
                {accounts.map((account) => (
                  <div key={account.id} className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                    <div className="p-5 flex items-start gap-4">
                      <Avatar className="h-14 w-14 rounded-full border-2 border-blue-100 shadow-sm">
                        <AvatarImage src={account.head_img} alt={account.nickname} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl">
                          {(account.nickname || '公').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-lg font-semibold text-gray-800 truncate">{account.nickname || '未命名公众号'}</h4>
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">已授权</Badge>
                          <Badge variant="outline" className="border-blue-200 text-blue-600 text-xs">
                            {account.verify_type_info >= 0 ? '已认证' : '未认证'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 font-mono mt-1 break-all">{account.app_id}</p>
                        <p className="text-xs text-gray-400 mt-2">创建于 {new Date(account.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500" onClick={() => handleDeleteAccount(account.authorizer_appid)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="auth" className="p-6 flex flex-col items-center">
            <Card className="w-full max-w-md border-0 shadow-none">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">扫码授权绑定公众号</CardTitle>
                <CardDescription>使用公众号管理员微信扫描下方二维码完成授权</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                {qrCodeLoading ? (
                  <div className="flex items-center justify-center w-64 h-64 bg-gray-50 rounded-2xl"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                ) : qrCodeUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100">
                    <img src={qrCodeUrl} alt="授权二维码" className="w-64 h-64" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-64 h-64 bg-gray-50 rounded-2xl">
                    <p className="text-gray-500 text-sm mb-4">{qrCodeError || '获取二维码失败'}</p>
                    <Button variant="outline" onClick={loadQrCode}>重新获取</Button>
                  </div>
                )}
                <p className="text-sm text-gray-500 text-center">扫码后，公众号将自动绑定到您的账号</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 bg-white rounded-xl p-5 border border-gray-100 text-sm text-gray-600 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />使用说明</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>授权公众号后，可以在智能创作页面将文章推送到草稿箱</li>
            <li>支持扫码授权方式</li>
            <li>可以随时解绑公众号</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function OfficialAccountPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <OfficialAccountContent />
    </Suspense>
  );
}
