'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  CheckCircle, 
  XCircle, 
  QrCode, 
  Trash2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Loader2,
  UserCircle
} from 'lucide-react';

interface WechatAccount {
  id: number;
  app_id: string;
  nickname: string;
  head_img: string;
  user_name: string;
  alias: string;
  principal_type: string;
  verify_type_info: number;
  qrcode_url: string;
  is_authorized: boolean;
  created_at: string;
  updated_at: string;
}

export default function AccountPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ configured: boolean }>({ configured: false });
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // 检查URL中的状态参数
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success) {
      setStatusMessage({ type: 'success', message: '公众号授权成功！' });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        no_auth_code: '授权失败：未获取到授权码',
        token_failed: '授权失败：获取令牌失败',
        auth_failed: '授权失败：授权信息获取失败',
        save_failed: '授权失败：保存授权信息失败',
        exception: '授权失败：发生异常',
      };
      setStatusMessage({ 
        type: 'error', 
        message: errorMessages[error] || '授权失败：未知错误' 
      });
    }
  }, [searchParams]);

  // 加载公众号列表
  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/wechat-auth/url');
      const result = await response.json();
      
      if (result.success) {
        setAccounts(result.accounts || []);
        setConfigStatus({ configured: result.configured });
      }
    } catch (error) {
      console.error('加载公众号失败:', error);
      setStatusMessage({ type: 'error', message: '加载公众号列表失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // 添加公众号（获取授权URL）
  const handleAddAccount = async () => {
    setIsAdding(true);
    try {
      const response = await fetch('/api/wechat-auth/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirectUri: `${window.location.origin}/api/wechat-auth/callback`,
        }),
      });
      const result = await response.json();

      if (result.success && result.data?.authUrl) {
        // 跳转到授权页面
        window.location.href = result.data.authUrl;
      } else {
        setStatusMessage({ type: 'error', message: result.message || '获取授权链接失败' });
        setIsAdding(false);
      }
    } catch (error) {
      console.error('获取授权URL失败:', error);
      setStatusMessage({ type: 'error', message: '获取授权链接失败' });
      setIsAdding(false);
    }
  };

  // 删除公众号
  const handleDeleteAccount = async (appId: string) => {
    if (!confirm('确定要解绑该公众号吗？')) return;

    try {
      const response = await fetch(`/api/wechat-auth/account/${appId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setAccounts(accounts.filter(a => a.app_id !== appId));
        setStatusMessage({ type: 'success', message: '解绑成功' });
      } else {
        setStatusMessage({ type: 'error', message: result.message || '解绑失败' });
      }
    } catch (error) {
      console.error('解绑失败:', error);
      setStatusMessage({ type: 'error', message: '解绑失败' });
    }
  };

  // 获取账号类型标签
  const getAccountTypeBadge = (account: WechatAccount) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      '0': { label: '订阅号', color: 'bg-blue-100 text-blue-700' },
      '1': { label: '服务号', color: 'bg-green-100 text-green-700' },
      '2': { label: '企业微信', color: 'bg-purple-100 text-purple-700' },
      '3': { label: '小程序', color: 'bg-orange-100 text-orange-700' },
    };
    const type = account.verify_type_info?.toString() || '0';
    const info = typeMap[type] || typeMap['0'];
    return (
      <Badge className={info.color}>
        {info.label}
      </Badge>
    );
  };

  // 获取认证状态
  const getVerifyStatus = (account: WechatAccount) => {
    if (account.verify_type_info === 0) {
      return <Badge variant="outline" className="text-gray-500">未认证</Badge>;
    } else if (account.verify_type_info >= 1) {
      return <Badge className="bg-green-100 text-green-700">已认证</Badge>;
    }
    return <Badge variant="outline">未知</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">公众号管理</h1>
          <p className="text-gray-600">管理和授权您的微信公众号，用于一键推送文章到公众号草稿箱</p>
        </div>

        {/* 状态消息 */}
        {statusMessage && (
          <Card className={`mb-6 ${
            statusMessage.type === 'success' ? 'border-green-500 bg-green-50' :
            statusMessage.type === 'error' ? 'border-red-500 bg-red-50' :
            'border-blue-500 bg-blue-50'
          }`}>
            <CardContent className="py-3 flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {statusMessage.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
              {statusMessage.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-500" />}
              <span className={statusMessage.type === 'error' ? 'text-red-700' : 'text-gray-700'}>
                {statusMessage.message}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto"
                onClick={() => setStatusMessage(null)}
              >
                关闭
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 配置说明 */}
        {!configStatus.configured && (
          <Card className="mb-6 border-2 border-dashed border-orange-300 bg-orange-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-2">演示模式</h3>
                  <p className="text-orange-700 text-sm mb-3">
                    当前系统未配置微信第三方平台，已进入演示模式。您可以体验授权流程，
                    但实际推送功能需要配置微信第三方平台才能使用。
                  </p>
                  <p className="text-orange-600 text-xs">
                    配置环境变量：WECHAT_COMPONENT_APPID、WECHAT_COMPONENT_APP_SECRET
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 添加公众号 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              添加公众号
            </CardTitle>
            <CardDescription>
              点击下方按钮，使用微信扫码授权您的公众号
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAddAccount} 
              disabled={isAdding}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  获取授权链接...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  微信扫码授权
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 公众号列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              已授权公众号
            </CardTitle>
            <CardDescription>
              共 {accounts.length} 个公众号
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <UserCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>暂无已授权的公众号</p>
                <p className="text-sm">点击上方按钮扫码授权您的公众号</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {accounts.map((account) => (
                  <div 
                    key={account.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                  >
                    {/* 头像 */}
                    <div className="flex-shrink-0">
                      {account.head_img ? (
                        <img 
                          src={account.head_img} 
                          alt={account.nickname}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <UserCircle className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {account.nickname || '未命名公众号'}
                        </h3>
                        {getAccountTypeBadge(account)}
                        {getVerifyStatus(account)}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        @{account.alias || account.user_name || account.app_id}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        AppID: {account.app_id}
                      </p>
                      <p className="text-xs text-gray-400">
                        授权时间: {new Date(account.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>

                    {/* 操作 */}
                    <div className="flex items-center gap-2">
                      {account.qrcode_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={account.qrcode_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            二维码
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteAccount(account.app_id)}
                        className="text-red-500 hover:text-red-600 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        解绑
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className="mt-6 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="text-lg">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3">
              <div className="bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p><strong>扫码授权：</strong>点击「微信扫码授权」按钮，使用公众号管理员微信扫码确认授权</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p><strong>授权成功：</strong>授权完成后，公众号将显示在「已授权公众号」列表中</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p><strong>一键推送：</strong>在「智能生文」页面生成文章后，点击「一键推送」按钮即可发送文章到公众号草稿箱</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p><strong>注意事项：</strong>每个公众号每年可授权给最多5个第三方平台</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
