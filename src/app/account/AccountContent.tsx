'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Key,
  Trash2,
  AlertCircle,
  Loader2,
  UserCircle,
  Shield,
  QrCode,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Settings
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

interface ScanAuthData {
  sessionId: string;
  authUrl: string;
  callbackUrl: string;
  expiresIn: number;
}

export default function AccountContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBinding, setIsBinding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [defaultTab, setDefaultTab] = useState<'scan' | 'manual' | 'list'>('list');
  
  // 绑定表单状态
  const [bindAppId, setBindAppId] = useState('');
  const [bindAppSecret, setBindAppSecret] = useState('');

  // 扫码授权状态
  const [scanLoading, setScanLoading] = useState(false);
  const [scanAuthData, setScanAuthData] = useState<ScanAuthData | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // 检查URL中的状态参数
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const tab = searchParams.get('tab');
    
    // 根据URL参数设置默认Tab
    if (tab === 'manual') {
      setDefaultTab('manual');
    } else if (tab === 'scan') {
      setDefaultTab('scan');
    } else if (accounts.length > 0) {
      // 如果有已绑定账号，默认显示列表
      setDefaultTab('list');
    }
    
    if (success) {
      setStatusMessage({ type: 'success', message: '公众号授权成功！' });
      setDefaultTab('list');
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
  }, [searchParams, accounts]);

  // 加载公众号列表
  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/wechat-auth/url');
      const result = await response.json();
      
      if (result.success) {
        setAccounts(result.accounts || []);
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

  // 生成微信授权链接
  const generateScanAuth = async () => {
    setScanLoading(true);
    setScanAuthData(null);
    
    try {
      const response = await fetch('/api/wechat-auth/scan', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setScanAuthData(result.data as ScanAuthData);
        setIsConfigured(result.configured || false);
        
        // 如果有授权URL，直接打开新窗口
        if (result.data.authUrl) {
          window.open(result.data.authUrl, '_blank');
        }
      } else if (result.needConfig) {
        // 需要配置环境变量
        setStatusMessage({ 
          type: 'error', 
          message: result.message || '请配置微信公众号凭证（WECHAT_APP_ID 和 WECHAT_APP_SECRET）' 
        });
        setIsConfigured(false);
      } else {
        setStatusMessage({ 
          type: 'error', 
          message: result.message || '生成授权链接失败' 
        });
      }
    } catch (error) {
      console.error('生成授权链接失败:', error);
      setStatusMessage({ type: 'error', message: '生成授权链接失败' });
    } finally {
      setScanLoading(false);
    }
  };

  // 复制授权链接
  const copyAuthUrl = async () => {
    if (!scanAuthData?.authUrl) return;
    
    try {
      await navigator.clipboard.writeText(scanAuthData.authUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = scanAuthData.authUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 直接通过AppID和AppSecret绑定
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

  // 删除公众号
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">公众号管理</h1>
          <p className="text-gray-600">绑定您的微信公众号，开启一键推送功能</p>
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

        {/* 绑定方式切换 */}
        <Tabs defaultValue={defaultTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              扫码授权
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              AppID绑定
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              已绑定 ({accounts.length})
            </TabsTrigger>
          </TabsList>

          {/* 扫码授权 */}
          <TabsContent value="scan">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-blue-500" />
                  微信扫码授权
                </CardTitle>
                <CardDescription>
                  使用微信公众号管理员扫码，快速完成授权绑定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 未配置提示 */}
                {isConfigured === false && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      需要配置微信凭证
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      请在服务器环境变量中配置以下凭证：
                    </p>
                    <div className="bg-white rounded p-3 font-mono text-sm space-y-1">
                      <div>WECHAT_APP_ID=您的AppID</div>
                      <div>WECHAT_APP_SECRET=您的AppSecret</div>
                    </div>
                    <p className="text-xs text-red-600 mt-3">
                      配置地址：微信公众平台 → 设置与开发 → 基本配置
                    </p>
                  </div>
                )}

                {/* 生成授权按钮 */}
                <Button 
                  onClick={generateScanAuth}
                  disabled={scanLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  size="lg"
                >
                  {scanLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      正在生成授权链接...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      打开微信授权页面
                    </>
                  )}
                </Button>

                {/* 授权链接显示 */}
                {scanAuthData?.authUrl && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        授权链接已生成
                      </h4>
                      <p className="text-sm text-green-700 mb-3">
                        请在微信中打开以下链接，或让管理员扫码授权
                      </p>
                      <div className="flex gap-2">
                        <Input 
                          value={scanAuthData.authUrl} 
                          readOnly 
                          className="font-mono text-sm flex-1"
                        />
                        <Button 
                          onClick={copyAuthUrl}
                          variant="outline"
                          size="icon"
                        >
                          {isCopied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          onClick={() => window.open(scanAuthData.authUrl, '_blank')}
                          variant="outline"
                          size="icon"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 授权步骤 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        授权步骤
                      </h4>
                      <ol className="text-sm text-blue-700 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">1</span>
                          <span>点击上方按钮或在微信中打开授权链接</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">2</span>
                          <span>使用公众号管理员微信扫码</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">3</span>
                          <span>确认授权后页面将自动跳转</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">4</span>
                          <span>返回此页面查看绑定结果</span>
                        </li>
                      </ol>
                    </div>

                    {/* 重新生成 */}
                    <Button 
                      onClick={generateScanAuth}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新生成授权链接
                    </Button>
                  </div>
                )}

                {/* 操作说明（无链接时显示） */}
                {!scanAuthData && isConfigured !== false && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      扫码授权步骤
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">1</span>
                        <span>点击上方按钮打开微信授权页面</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">2</span>
                        <span>使用公众号管理员微信扫码确认</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">3</span>
                        <span>授权成功后自动完成绑定</span>
                      </li>
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 手动输入绑定 */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  输入公众号凭证绑定
                </CardTitle>
                <CardDescription>
                  在微信公众平台获取AppID和AppSecret，输入以下信息完成绑定
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 获取凭证说明 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">如何获取AppID和AppSecret？</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>登录微信公众平台：<a href="https://mp.weixin.qq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://mp.weixin.qq.com</a></li>
                    <li>进入「设置与开发」→「基本配置」</li>
                    <li>找到「AppID」和「AppSecret」</li>
                    <li>如果未设置，需点击「设置」按钮设置管理员密码</li>
                  </ol>
                </div>

                {/* 表单 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="appId">AppID</Label>
                    <Input
                      id="appId"
                      placeholder="例如：wx1234567890abcdef"
                      value={bindAppId}
                      onChange={(e) => setBindAppId(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500">以wx开头的公众号唯一标识符</p>
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
                    <p className="text-xs text-gray-500">公众号的密钥，请妥善保管</p>
                  </div>

                  <Button 
                    onClick={handleBindAccount}
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 已绑定公众号列表 */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  已绑定公众号
                </CardTitle>
                <CardDescription>
                  共 {accounts.length} 个公众号，绑定后可使用一键推送功能
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <UserCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无已绑定的公众号</p>
                    <p className="text-sm">使用「扫码授权」或「AppID绑定」添加公众号</p>
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
                          <p className="text-xs text-gray-400 truncate">
                            AppID: {account.app_id}
                          </p>
                        </div>

                        {/* 操作 */}
                        <div className="flex-shrink-0 flex gap-2">
                          {account.qrcode_url && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(account.qrcode_url, '_blank')}
                            >
                              <QrCode className="h-4 w-4 mr-1" />
                              二维码
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteAccount(account.app_id)}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
