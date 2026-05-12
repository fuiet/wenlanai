'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  Settings,
  Key,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface ConfigStatus {
  configured: boolean;
  hasTicket: boolean;
  config: {
    appId: string;
    hasSecret: boolean;
  } | null;
}

export default function WechatSetupPage() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // 当前域名
  const domain = typeof window !== 'undefined' 
    ? window.location.origin.replace('https://', '').replace('http://', '') 
    : 'your-domain.com';

  // 回调URL
  const urls = {
    authEvent: `https://${domain}/api/wechat/auth-event`,
    callback: `https://${domain}/api/wechat-auth/callback`,
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // 加载配置状态
  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wechat-auth/scan');
      const result = await response.json();
      setStatus(result);
      if (result.config?.appId) {
        setAppId(result.config.appId);
      }
    } catch (error) {
      console.error('加载状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    if (!appId.trim() || !appSecret.trim()) {
      setMessage({ type: 'error', text: '请填写AppID和AppSecret' });
      return;
    }

    if (!appId.startsWith('wx')) {
      setMessage({ type: 'error', text: 'AppID格式不正确，应以wx开头' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/wechat-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId.trim(),
          appSecret: appSecret.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '配置保存成功！' });
        setAppSecret(''); // 清空密钥
        loadStatus(); // 重新加载状态
      } else {
        setMessage({ type: 'error', text: result.message || '保存失败' });
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setMessage({ type: 'error', text: '保存失败，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">微信第三方平台配置</h1>

      {/* 当前状态 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">配置状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {status?.configured ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>第三方平台配置</span>
              </div>
              <Badge variant={status?.configured ? 'default' : 'secondary'}>
                {status?.configured ? '已配置' : '未配置'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {status?.hasTicket ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>Component Verify Ticket</span>
              </div>
              <Badge variant={status?.hasTicket ? 'default' : 'secondary'}>
                {status?.hasTicket ? '已接收' : '未接收'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 配置步骤 */}
      {!status?.configured && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              步骤1：配置第三方平台
            </CardTitle>
            <CardDescription>
              在微信公众平台创建第三方平台后，填写以下配置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 需要配置的URL */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge variant="outline">必填</Badge>
                  授权事件接收URL
                </Label>
                <div className="flex gap-2">
                  <Input value={urls.authEvent} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(urls.authEvent, 'authEvent')}
                  >
                    {copied === 'authEvent' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge variant="outline">必填</Badge>
                  授权回调URL
                </Label>
                <div className="flex gap-2">
                  <Input value={urls.callback} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(urls.callback, 'callback')}
                  >
                    {copied === 'callback' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>配置说明</AlertTitle>
              <AlertDescription>
                请将以上URL填写到微信公众平台的第三方平台设置中。配置完成后，微信会每10分钟推送一次component_verify_ticket。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 保存配置 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {status?.configured ? '已配置的AppID' : '步骤2：保存AppID和AppSecret'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>第三方平台AppID</Label>
            <Input
              placeholder="wx开头，如：wx1234567890abcdef"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>第三方平台AppSecret</Label>
            <Input
              type="password"
              placeholder="32位密钥"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              className="font-mono"
            />
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Button onClick={saveConfig} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {status?.configured ? '更新配置' : '保存配置'}
          </Button>
        </CardContent>
      </Card>

      {/* 下一步 */}
      {status?.configured && (
        <Card>
          <CardHeader>
            <CardTitle>下一步</CardTitle>
          </CardHeader>
          <CardContent>
            {status.hasTicket ? (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>配置完成</AlertTitle>
                  <AlertDescription>
                    已收到component_verify_ticket，可以进行扫码授权了
                  </AlertDescription>
                </Alert>
                
                <Button asChild>
                  <a href="/official-account?tab=auth">
                    前往绑定公众号
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>等待接收ticket</AlertTitle>
                <AlertDescription>
                  配置已保存，正在等待微信推送component_verify_ticket（每10分钟推送一次）。
                  请确认授权事件接收URL配置正确。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 帮助链接 */}
      <div className="mt-6 text-center">
        <Button variant="link" asChild>
          <a href="https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/Third_party_platform_appid.html" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            微信第三方平台开发文档
          </a>
        </Button>
      </div>
    </div>
  );
}
