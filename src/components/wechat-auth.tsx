'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface WechatAuthProps {
  onAuthorized?: (data: { appId: string; appSecret: string }) => void;
}

export default function WechatAuth({ onAuthorized }: WechatAuthProps) {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  // 获取授权URL
  const getAuthUrl = () => {
    const redirectUri = encodeURIComponent(
      `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/wechat/auth-callback`
    );
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`;
  };

  // 获取公众号access_token
  const handleGetAccessToken = async () => {
    if (!appId || !appSecret) {
      setError('请填写AppID和AppSecret');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/wechat/get-access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appId, appSecret }),
      });

      const result = await response.json();

      if (result.success) {
        setAccessToken(result.data.accessToken);
        setSuccess(true);
        onAuthorized?.({ appId, appSecret });
        setError('');
      } else {
        setError(result.error || '获取access_token失败');
        setSuccess(false);
      }
    } catch {
      setError('网络错误，请重试');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // 跳转微信授权页面
  const handleAuth = () => {
    if (!appId) {
      setError('请先填写AppID');
      return;
    }
    window.location.href = getAuthUrl();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>微信公众号授权</CardTitle>
        <CardDescription>
          配置微信公众号信息，启用文章批量推送功能
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 授权说明 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>如何获取AppID和AppSecret？</strong>
            <br />
            1. 登录微信公众平台（mp.weixin.qq.com）
            <br />
            2. 进入「设置与开发」→「基本配置」
            <br />
            3. 复制AppID和重置AppSecret
          </AlertDescription>
        </Alert>

        {/* AppID输入 */}
        <div className="space-y-2">
          <Label htmlFor="appId">AppID</Label>
          <Input
            id="appId"
            placeholder="wx1234567890abcdef"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* AppSecret输入 */}
        <div className="space-y-2">
          <Label htmlFor="appSecret">AppSecret</Label>
          <Input
            id="appSecret"
            type="password"
            placeholder="请输入AppSecret"
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 成功提示 */}
        {success && (
          <Alert className="border-green-500 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              授权成功！access_token已获取，可以使用批量推送功能。
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={handleGetAccessToken}
            disabled={loading}
            className="flex-1"
          >
            {loading ? '获取中...' : '获取access_token'}
          </Button>
          <Button
            onClick={handleAuth}
            variant="outline"
            disabled={!appId}
            className="flex-1"
          >
            微信授权
          </Button>
        </div>

        {/* access_token展示 */}
        {accessToken && (
          <div className="space-y-2">
            <Label>Access Token（有效期2小时）</Label>
            <div className="p-3 bg-muted rounded-md text-sm font-mono break-all">
              {accessToken}
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Access Token已保存在本地，可以用于批量推送文章。
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
