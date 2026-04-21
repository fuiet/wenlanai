'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ExternalLink,
  AlertCircle,
  Loader2,
  UserCircle,
  Shield,
  QrCode,
  Smartphone,
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Timer
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
  authCode: string;
  expiresAt: string;
  qrCodeUrl: string;
  remainingSeconds: number;
}

export default function AccountContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<WechatAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBinding, setIsBinding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // 绑定表单状态
  const [bindAppId, setBindAppId] = useState('');
  const [bindAppSecret, setBindAppSecret] = useState('');

  // 扫码授权状态
  const [scanLoading, setScanLoading] = useState(false);
  const [scanAuthData, setScanAuthData] = useState<ScanAuthData | null>(null);
  const [inputAuthCode, setInputAuthCode] = useState('');
  const [remainingTime, setRemainingTime] = useState(600);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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

  // 生成二维码授权
  const generateScanAuth = async () => {
    setScanLoading(true);
    setScanAuthData(null);
    setInputAuthCode('');
    
    try {
      const response = await fetch('/api/wechat-auth/scan', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setScanAuthData(result.data);
        setRemainingTime(result.data.expiresIn);
      } else {
        setStatusMessage({ 
          type: 'error', 
          message: result.message || '生成授权码失败' 
        });
      }
    } catch (error) {
      console.error('生成授权码失败:', error);
      setStatusMessage({ type: 'error', message: '生成授权码失败' });
    } finally {
      setScanLoading(false);
    }
  };

  // 倒计时
  useEffect(() => {
    if (!scanAuthData) return;
    
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          setScanAuthData(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [scanAuthData]);

  // 验证授权码并绑定
  const handleVerifyCode = async () => {
    if (!inputAuthCode.trim() || inputAuthCode.length !== 6) {
      setStatusMessage({ type: 'error', message: '请输入6位授权码' });
      return;
    }

    if (!scanAuthData) {
      setStatusMessage({ type: 'error', message: '请先生成授权二维码' });
      return;
    }

    setIsVerifying(true);
    setStatusMessage(null);

    try {
      // 验证授权码
      const response = await fetch(`/api/wechat-auth/scan?sessionId=${scanAuthData.sessionId}`);
      const result = await response.json();

      if (result.success) {
        if (result.data.status === 'completed' && result.data.appId) {
          // 授权完成，使用授权的AppId绑定
          const bindResponse = await fetch('/api/wechat-auth/bind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appId: result.data.appId,
            }),
          });

          const bindResult = await bindResponse.json();

          if (bindResult.success) {
            setStatusMessage({ 
              type: 'success', 
              message: `绑定成功！公众号「${bindResult.data?.nickname || result.data.nickname || result.data.appId}」已绑定` 
            });
            setScanAuthData(null);
            setInputAuthCode('');
            loadAccounts();
          } else {
            setStatusMessage({ 
              type: 'error', 
              message: bindResult.message || '绑定失败' 
            });
          }
        } else {
          setStatusMessage({ 
            type: 'info', 
            message: '请使用微信扫码获取授权码完成授权' 
          });
        }
      } else {
        setStatusMessage({ 
          type: 'error', 
          message: result.message || '授权码验证失败' 
        });
      }
    } catch (error) {
      console.error('验证授权码失败:', error);
      setStatusMessage({ type: 'error', message: '验证授权码失败' });
    } finally {
      setIsVerifying(false);
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

  // 复制授权码
  const copyAuthCode = async () => {
    if (!scanAuthData?.authCode) return;
    
    try {
      await navigator.clipboard.writeText(scanAuthData.authCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = scanAuthData.authCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
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
    if (account.verify_type_info === 0 || account.verify_type_info === 1 || account.verify_type_info === 2 || account.verify_type_info === 3 || account.verify_type_info === 4 || account.verify_type_info === 5) {
      return <Badge variant="default" className="text-xs bg-green-500">已认证</Badge>;
    }
    return null;
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <Tabs defaultValue="scan" className="mb-6">
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
                  扫码授权公众号
                </CardTitle>
                <CardDescription>
                  打开微信扫一扫，授权绑定您的公众号
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!scanAuthData ? (
                  <>
                    {/* 生成二维码按钮 */}
                    <Button 
                      onClick={generateScanAuth}
                      disabled={scanLoading}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      size="lg"
                    >
                      {scanLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          正在生成授权码...
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-4 w-4" />
                          生成授权二维码
                        </>
                      )}
                    </Button>

                    {/* 操作说明 */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        扫码授权步骤
                      </h4>
                      <ol className="text-sm text-blue-700 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">1</span>
                          <span>点击上方按钮生成授权二维码</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">2</span>
                          <span>用微信扫一扫识别二维码</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">3</span>
                          <span>在微信中复制显示的授权码</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">4</span>
                          <span>返回此处输入授权码完成绑定</span>
                        </li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 左侧：二维码 */}
                    <div className="space-y-4">
                      {/* 二维码 */}
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center">
                        {scanAuthData.qrCodeUrl ? (
                          <img 
                            src={scanAuthData.qrCodeUrl} 
                            alt="授权二维码" 
                            className="w-48 h-48"
                          />
                        ) : (
                          <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                            <QrCode className="h-16 w-16 text-gray-400" />
                          </div>
                        )}
                        
                        {/* 授权码显示 */}
                        <div className="mt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">授权码</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold font-mono tracking-widest text-blue-600">
                              {scanAuthData.authCode}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={copyAuthCode}
                              className="h-8 w-8 p-0"
                            >
                              {isCopied ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* 倒计时 */}
                        <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                          <Timer className="h-4 w-4" />
                          <span>有效期：{formatTime(remainingTime)}</span>
                        </div>
                      </div>

                      {/* 重新生成 */}
                      <Button 
                        onClick={generateScanAuth}
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        重新生成
                      </Button>
                    </div>

                    {/* 右侧：输入授权码 */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="authCode">输入授权码</Label>
                        <Input
                          id="authCode"
                          placeholder="请输入6位授权码"
                          value={inputAuthCode}
                          onChange={(e) => setInputAuthCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="text-center text-xl font-mono tracking-widest"
                          maxLength={6}
                        />
                        <p className="text-xs text-gray-500 text-center">
                          在微信扫码后的页面复制授权码
                        </p>
                      </div>

                      <Button 
                        onClick={handleVerifyCode}
                        disabled={isVerifying || inputAuthCode.length !== 6}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        size="lg"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            验证中...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            验证并绑定
                          </>
                        )}
                      </Button>

                      {/* 操作提示 */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          操作提示
                        </h4>
                        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                          <li>用微信扫描左侧二维码</li>
                          <li>微信中会显示6位授权码</li>
                          <li>复制授权码填入左侧输入框</li>
                          <li>点击「验证并绑定」完成授权</li>
                        </ul>
                      </div>
                    </div>
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
