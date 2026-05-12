'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserCheck,
  Plus,
  Settings,
  CheckCircle,
  AlertCircle,
  Send,
  QrCode,
  UserCircle,
  Loader2,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Trash2
} from 'lucide-react';


// 公众号账号类型
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

// 模拟公众号数据
const mockAccounts = [
  {
    id: 1,
    name: '上岸的笔记',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=account1',
    appId: 'wxa36f34f5d6bd8c58',
    status: 'authorized',
    accountStatus: 'normal',
    groupName: '默认分组',
    createTime: '2024-12-15',
  },
];

const groups = [
  { id: 1, name: '默认分组', count: 1 },
];

function OfficialAccountContent() {
  const searchParams = useSearchParams();
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isManageGroupDialogOpen, setIsManageGroupDialogOpen] = useState(false);
  const [isBatchSendDialogOpen, setIsBatchSendDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [authInfo, setAuthInfo] = useState<{ appId: string; appSecret: string; accessToken: string } | null>(null);
  const [defaultTab, setDefaultTab] = useState('accounts');

  // 账号管理相关状态
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [isBinding, setIsBinding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [bindAppId, setBindAppId] = useState('');
  const [bindAppSecret, setBindAppSecret] = useState('');

  // 第三方平台配置相关状态
  const [componentAppId, setComponentAppId] = useState('');
  const [componentAppSecret, setComponentAppSecret] = useState('');
  const [componentRedirectUri, setComponentRedirectUri] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ configured: boolean; appId?: string } | null>(null);
  const [showConfigSuccess, setShowConfigSuccess] = useState(false);

  // 模拟待推送文章数据
  const mockArticles = [
    {
      id: 1,
      title: '2024年低粉爆款文案：这3个技巧让你从0到10万粉',
      author: '文澜智作',
      digest: '如何通过精准定位和高质量内容快速涨粉？本文揭秘爆款公众号的运营秘诀...',
      content: '这里是文章的完整内容...',
      content_source_url: 'https://example.com/article/1',
    },
    {
      id: 2,
      title: 'AI写作工具测评：5款免费工具让你的写作效率翻倍',
      author: '文澜智作',
      digest: '对比5款热门AI写作工具，从功能、价格、易用性三个维度进行全面分析...',
      content: '这里是文章的完整内容...',
      content_source_url: 'https://example.com/article/2',
    },
  ];
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);

  // 检查URL参数
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'auth') {
      setDefaultTab('auth');
    } else if (tab === 'config') {
      setDefaultTab('config');
    }
  }, [searchParams]);

  // 加载公众号账号列表
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

  // 加载第三方平台配置状态
  const loadConfigStatus = async () => {
    try {
      const response = await fetch('/api/wechat-config');
      const result = await response.json();
      if (result.success) {
        setConfigStatus({
          configured: result.configured,
          appId: result.config?.appId,
        });
        if (result.config?.appId) {
          setComponentAppId(result.config.appId);
        }
      }
    } catch (error) {
      console.error('加载配置状态失败:', error);
    }
  };

  // 保存第三方平台配置
  const saveComponentConfig = async () => {
    if (!componentAppId.trim() || !componentAppSecret.trim()) {
      setStatusMessage({ type: 'error', message: '请输入完整的AppID和AppSecret' });
      return;
    }

    if (!componentAppId.startsWith('wx')) {
      setStatusMessage({ type: 'error', message: 'AppID格式不正确，应以wx开头' });
      return;
    }

    setIsConfiguring(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/wechat-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: componentAppId.trim(),
          appSecret: componentAppSecret.trim(),
          redirectUri: componentRedirectUri.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatusMessage({ type: 'success', message: '第三方平台配置成功！' });
        setShowConfigSuccess(true);
        setConfigStatus({ configured: true, appId: componentAppId });
        setComponentAppSecret(''); // 清空密钥显示
      } else {
        setStatusMessage({ type: 'error', message: result.message || '配置保存失败' });
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setStatusMessage({ type: 'error', message: '保存失败，请稍后重试' });
    } finally {
      setIsConfiguring(false);
    }
  };

  // 删除第三方平台配置
  const deleteComponentConfig = async () => {
    if (!confirm('确定要删除第三方平台配置吗？删除后将无法使用扫码授权功能。')) {
      return;
    }

    try {
      const response = await fetch('/api/wechat-config', {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setStatusMessage({ type: 'success', message: '配置已删除' });
        setConfigStatus({ configured: false });
        setComponentAppId('');
        setComponentAppSecret('');
      }
    } catch (error) {
      console.error('删除配置失败:', error);
      setStatusMessage({ type: 'error', message: '删除失败' });
    }
  };

  useEffect(() => {
    loadAccounts();
    loadConfigStatus();
  }, []);

  // 绑定公众号 - 跳转到微信授权页面
  const handleBindWechat = async () => {
    setIsBinding(true);
    setStatusMessage(null);
    try {
      // 调用本地API（代理到宝塔后端）
      const response = await fetch('/api/wechat/auth-url', {
        method: 'GET',
      });
      const result = await response.json();
      
      if (result.success && result.data?.auth_url) {
        // 使用当前页面跳转到微信授权页面
        window.location.href = result.data.auth_url;
      } else {
        setStatusMessage({ 
          type: 'error', 
          message: result.error || result.data?.message || '获取授权链接失败' 
        });
        setIsBinding(false);
      }
    } catch (error) {
      console.error('获取授权链接失败:', error);
      setStatusMessage({ type: 'error', message: '连接后端服务失败，请检查服务状态' });
      setIsBinding(false);
    }
  };

  // AppID/AppSecret绑定
  const handleBindAccount = async () => {
    if (!bindAppId.trim() || !bindAppSecret.trim()) {
      setStatusMessage({ type: 'error', message: '请输入AppID和AppSecret' });
      return;
    }

    setIsBinding(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/wechat-auth/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: bindAppId.trim(),
          appSecret: bindAppSecret.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatusMessage({ 
          type: 'success', 
          message: `绑定成功！公众号「${result.data?.nickname || bindAppId}」已绑定` 
        });
        setBindAppId('');
        setBindAppSecret('');
        loadAccounts();
        setDefaultTab('list');
      } else {
        setStatusMessage({ 
          type: 'error', 
          message: result.message || '绑定失败，请检查AppID和AppSecret是否正确' 
        });
      }
    } catch (error) {
      console.error('绑定公众号失败:', error);
      setStatusMessage({ type: 'error', message: '绑定失败，请稍后重试' });
    } finally {
      setIsBinding(false);
    }
  };

  // 解绑公众号
  const handleDeleteAccount = async (appId: string) => {
    if (!confirm('确定要解绑该公众号吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/wechat-auth/account/${appId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setStatusMessage({ type: 'success', message: '解绑成功' });
        loadAccounts();
      } else {
        setStatusMessage({ type: 'error', message: result.message || '解绑失败' });
      }
    } catch (error) {
      console.error('解绑公众号失败:', error);
      setStatusMessage({ type: 'error', message: '解绑失败，请稍后重试' });
    }
  };

  // 获取账号类型徽章
  const getAccountTypeBadge = (account: WechatAccount) => {
    const typeMap: Record<string, string> = {
      0: '订阅号',
      1: '服务号',
      2: '企业微信',
    };
    const type = typeMap[account.principal_type] || '公众号';
    return (
      <Badge variant="outline" className="text-xs">
        {type}
      </Badge>
    );
  };

  // 获取认证状态
  const getVerifyStatus = (account: WechatAccount) => {
    if (account.verify_type_info === -1) {
      return <Badge variant="destructive" className="text-xs">未认证</Badge>;
    }
    if (account.verify_type_info >= 0) {
      return <Badge variant="default" className="text-xs bg-green-500">已认证</Badge>;
    }
    return null;
  };

  const filteredAccounts = accounts.filter(account => {
    if (selectedGroup === 'all') return true;
    return account.nickname === selectedGroup;
  });

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      alert(`添加分组: ${newGroupName}`);
      setNewGroupName('');
    }
  };

  const handleAuthorized = (data: { appId: string; appSecret: string }) => {
    console.log('公众号授权成功:', data);
    setAuthInfo({ ...data, accessToken: '' });
    setIsAuthDialogOpen(false);
  };

  const handleBatchSend = async () => {
    if (!authInfo?.accessToken) {
      alert('请先授权公众号并获取access_token');
      return;
    }

    if (selectedArticles.length === 0) {
      alert('请至少选择一篇文章');
      return;
    }

    try {
      const articlesToSend = mockArticles
        .filter(article => selectedArticles.includes(article.id))
        .map(article => ({
          title: article.title,
          author: article.author,
          digest: article.digest,
          content: article.content,
          content_source_url: article.content_source_url,
        }));

      const response = await fetch('/api/wechat/batch-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: authInfo.accessToken,
          articles: articlesToSend,
          target: { isToAll: true },
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`推送成功！消息ID: ${result.data.msgId}`);
        setIsBatchSendDialogOpen(false);
        setSelectedArticles([]);
      } else {
        alert(`推送失败: ${result.error}`);
      }
    } catch {
      alert('推送失败，请检查网络连接');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-xl font-bold text-gray-900 flex items-center">
          <UserCheck className="mr-3 h-8 w-8 text-orange-500" />
          公众号管理
        </h1>
        <p className="text-sm text-gray-500">管理您的授权公众号，绑定账号并推送文章</p>
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
            {statusMessage.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
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

      {/* Tab切换 */}
      <Tabs defaultValue={defaultTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            公众号列表 ({accounts.length})
          </TabsTrigger>
          <TabsTrigger value="auth" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            扫码授权
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            平台配置
            {configStatus?.configured && <span className="ml-1 text-green-500">✓</span>}
          </TabsTrigger>
        </TabsList>

        {/* 公众号列表Tab */}
        <TabsContent value="accounts" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <Button
                onClick={() => setIsBatchSendDialogOpen(true)}
                variant="outline"
                disabled={!authInfo}
                className={authInfo ? 'bg-green-50 text-green-700 border-green-200' : ''}
              >
                <Send className="mr-2 h-4 w-4" />
                批量推送
              </Button>
              <Button 
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                onClick={() => setDefaultTab('auth')}
              >
                <Plus className="mr-2 h-5 w-5" />
                授权公众号
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {/* Left Panel - Group Filter */}
            <Card className="h-fit">
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">分组筛选</h3>
                <p className="mb-4 text-sm text-gray-500">
                  {groups.length} 个分组 · {accounts.length} 个公众号
                </p>
                <div className="space-y-2">
                  <Button
                    variant={selectedGroup === 'all' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setSelectedGroup('all')}
                  >
                    {selectedGroup === 'all' ? (
                      <Badge className="mr-2 bg-orange-500">
                        {accounts.length} 个
                      </Badge>
                    ) : (
                      <span className="mr-2 text-sm text-gray-500">
                        {accounts.length} 个
                      </span>
                    )}
                    全部公众号
                  </Button>
                  {groups.map((group) => (
                    <Button
                      key={group.id}
                      variant={selectedGroup === group.name ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setSelectedGroup(group.name)}
                    >
                      {selectedGroup === group.name ? (
                        <Badge className="mr-2 bg-orange-500">
                          {group.count} 个
                        </Badge>
                      ) : (
                        <span className="mr-2 text-sm text-gray-500">
                          {group.count} 个
                        </span>
                      )}
                      {group.name}
                    </Button>
                  ))}
                </div>
                <Dialog open={isManageGroupDialogOpen} onOpenChange={setIsManageGroupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4 w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      管理分组
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>管理分组</DialogTitle>
                      <DialogDescription>创建或编辑公众号分组</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="groupName">分组名称</Label>
                        <Input
                          id="groupName"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="例如：情感号矩阵"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsManageGroupDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleAddGroup}>
                          <Plus className="mr-2 h-4 w-4" />
                          添加分组
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Right Panel - Account List */}
            <div className="lg:col-span-3 space-y-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  共 {filteredAccounts.length} 个公众号
                </h3>
              </div>

              {filteredAccounts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <UserCheck className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <p className="text-gray-500">暂无授权公众号</p>
                    <p className="mt-2 text-sm text-gray-400">点击&ldquo;授权公众号&rdquo;按钮开始使用</p>
                  </CardContent>
                </Card>
              ) : (
                filteredAccounts.map((account) => (
                  <Card key={account.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-16 w-16 border-2 border-orange-200">
                            <AvatarImage src={account.head_img} alt={account.nickname} />
                            <AvatarFallback className="bg-orange-500 text-white text-xl">
                              {(account.nickname || '未命名').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="mb-1 text-xl font-semibold text-gray-900">
                              {account.nickname || '未命名公众号'}
                            </h4>
                            <p className="mb-3 text-sm text-gray-500 font-mono">
                              {account.app_id}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="secondary"
                                className={account.is_authorized ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                              >
                                {account.is_authorized ? (
                                  <>
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    已授权
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="mr-1 h-3 w-3" />
                                    未授权
                                  </>
                                )}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={account.verify_type_info >= 0 ? 'border-orange-200 text-orange-700' : 'border-red-200 text-red-700'}
                              >
                                {account.verify_type_info >= 0 ? '已认证' : '未认证'}
                              </Badge>
                              <Badge variant="outline">{account.alias || '公众号'}</Badge>
                              <span className="text-xs text-gray-400 flex items-center">
                                创建于 {new Date(account.created_at).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* 账号管理Tab */}
        <TabsContent value="auth" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* 扫码授权 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-blue-500" />
                  绑定公众号
                </CardTitle>
                <CardDescription>
                  点击按钮跳转到微信授权页面，扫码授权绑定您的公众号
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleBindWechat}
                  disabled={isBinding}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  size="lg"
                >
                  {isBinding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      正在跳转...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      绑定公众号
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  点击后将跳转到微信授权页面，请使用公众号管理员微信扫码授权
                </p>
              </CardContent>
            </Card>

            {/* AppID绑定 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  AppID绑定
                </CardTitle>
                <CardDescription>
                  输入公众号凭证完成绑定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appId">AppID</Label>
                  <Input
                    id="appId"
                    placeholder="例如：wx1234567890abcdef"
                    value={bindAppId}
                    onChange={(e) => setBindAppId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appSecret">AppSecret</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    placeholder="请输入AppSecret"
                    value={bindAppSecret}
                    onChange={(e) => setBindAppSecret(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <Button 
                  onClick={() => {
                    handleBindAccount();
                  }}
                  disabled={isBinding || !bindAppId || !bindAppSecret}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                >
                  {isBinding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      绑定中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      确认绑定
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  获取位置：微信公众平台 → 设置与开发 → 基本配置
                </p>
              </CardContent>
            </Card>

            {/* 已绑定列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  已绑定 ({accounts.length})
                </CardTitle>
                <CardDescription>
                  绑定后可使用一键推送功能
                </CardDescription>
              </CardHeader>
              <CardContent>
                {accountsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <UserCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">暂无已绑定的公众号</p>
                    <p className="text-xs text-gray-400 mt-1">使用左侧方式添加</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {accounts.map((account) => (
                      <div 
                        key={account.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow"
                      >
                        {/* 头像 */}
                        <div className="flex-shrink-0">
                          {account.head_img ? (
                            <img 
                              src={account.head_img} 
                              alt={account.nickname}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <UserCircle className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* 信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <h4 className="font-medium text-gray-900 truncate text-sm">
                              {account.nickname || '未命名公众号'}
                            </h4>
                            {getAccountTypeBadge(account)}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {account.alias || account.user_name || account.app_id}
                          </p>
                        </div>

                        {/* 解绑按钮 */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteAccount(account.app_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 平台配置Tab */}
        <TabsContent value="config" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  微信第三方平台配置
                </CardTitle>
                <CardDescription>
                  配置您的微信第三方平台，才能使用扫码授权和推送到草稿箱功能
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 配置状态 */}
                <div className={`p-4 rounded-lg ${configStatus?.configured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                  <div className="flex items-center gap-2">
                    {configStatus?.configured ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-700">已配置第三方平台</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <span className="font-medium text-yellow-700">未配置第三方平台</span>
                      </>
                    )}
                  </div>
                  {configStatus?.configured && (
                    <p className="text-sm text-green-600 mt-2">
                      AppID: {configStatus.appId}
                    </p>
                  )}
                  {!configStatus?.configured && (
                    <p className="text-sm text-yellow-600 mt-2">
                      请先配置第三方平台，才能使用扫码授权和推送到草稿箱功能
                    </p>
                  )}
                </div>

                {/* 配置表单 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="componentAppId">第三方平台 AppID</Label>
                    <Input
                      id="componentAppId"
                      value={componentAppId}
                      onChange={(e) => setComponentAppId(e.target.value)}
                      placeholder="wx开头，例如：wx1234567890abcdef"
                      disabled={isConfiguring}
                    />
                    <p className="text-xs text-gray-500">
                      登录微信公众平台 → 第三方平台 → 查看平台信息
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="componentAppSecret">第三方平台 AppSecret</Label>
                    <Input
                      id="componentAppSecret"
                      type="password"
                      value={componentAppSecret}
                      onChange={(e) => setComponentAppSecret(e.target.value)}
                      placeholder="输入AppSecret"
                      disabled={isConfiguring}
                    />
                    <p className="text-xs text-gray-500">
                      重要：请妥善保管，不要泄露给他人
                    </p>
                  </div>

                  {/* 状态消息 */}
                  {statusMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      statusMessage.type === 'success' ? 'bg-green-50 text-green-700' :
                      statusMessage.type === 'error' ? 'bg-red-50 text-red-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {statusMessage.type === 'success' && <CheckCircle className="h-4 w-4 inline mr-2" />}
                      {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4 inline mr-2" />}
                      {statusMessage.message}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <Button
                      onClick={saveComponentConfig}
                      disabled={isConfiguring}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {isConfiguring ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          保存配置
                        </>
                      )}
                    </Button>
                    {configStatus?.configured && (
                      <Button
                        onClick={deleteComponentConfig}
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除配置
                      </Button>
                    )}
                  </div>
                </div>

                {/* 申请教程 */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    如何申请微信第三方平台？
                  </h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-700 mb-2">第一步：注册微信开放平台账号</p>
                      <p>访问微信开放平台 (open.weixin.qq.com)，注册开发者账号</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-700 mb-2">第二步：创建第三方平台</p>
                      <p>在管理中心创建第三方平台，填写平台信息</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-700 mb-2">第三步：获取AppID和AppSecret</p>
                      <p>在第三方平台详情页获取AppID和AppSecret，填入上方表单</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-700">
                        <strong>提示：</strong>申请第三方平台需要资质认证（个人或企业）。资质审核通过后即可使用。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 配置成功提示 */}
            {showConfigSuccess && (
              <Card className="mt-6 bg-green-50 border-green-200">
                <CardContent className="py-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-700">配置成功！</h4>
                      <p className="text-sm text-green-600 mt-1">
                        现在可以切换到「扫码授权」选项卡，授权您的公众号了。
                      </p>
                      <Button
                        onClick={() => setDefaultTab('auth')}
                        className="mt-3 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        去扫码授权
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="mt-6 bg-gradient-to-br from-purple-50 to-orange-50 border-2">
        <CardContent className="py-6">
          <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            使用说明
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 授权公众号后，可以在智能生文页面直接将文章推送到草稿箱</li>
            <li>• 支持扫码授权和AppID绑定两种方式</li>
            <li>• 可以创建分组，方便管理多个公众号</li>
            <li>• 授权信息安全存储，您可以随时解绑</li>
          </ul>
        </CardContent>
      </Card>

      {/* 批量推送对话框 */}
      <Dialog open={isBatchSendDialogOpen} onOpenChange={setIsBatchSendDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量推送文章</DialogTitle>
            <DialogDescription>
              选择要推送的文章，系统将自动群发到您的公众号
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {mockArticles.map((article) => (
                <Card
                  key={article.id}
                  className={`cursor-pointer transition-colors ${
                    selectedArticles.includes(article.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'hover:border-orange-300'
                  }`}
                  onClick={() => {
                    setSelectedArticles(prev =>
                      prev.includes(article.id)
                        ? prev.filter(id => id !== article.id)
                        : [...prev, article.id]
                    );
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-orange-300 mt-1">
                        {selectedArticles.includes(article.id) && (
                          <CheckCircle className="h-3.5 w-3.5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{article.title}</h4>
                        <p className="text-sm text-gray-500 mb-2">{article.author}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{article.digest}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsBatchSendDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  handleBatchSend();
                }}
                disabled={selectedArticles.length === 0}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Send className="mr-2 h-4 w-4" />
                推送 {selectedArticles.length} 篇文章
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OfficialAccountPage() {
  'use client';
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div></div>}>
      <OfficialAccountContent />
    </Suspense>
  );
}
