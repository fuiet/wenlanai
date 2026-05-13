'use client';

import { useState, useEffect } from 'react';
import { WECHAT_API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Copy, ExternalLink } from 'lucide-react';

export default function WechatSetupPage() {
  const [config, setConfig] = useState({
    appId: '',
    appSecret: '',
    token: '',
    encodingAESKey: '',
  });
  const [savedConfig, setSavedConfig] = useState<Record<string, unknown> | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取已保存的配置
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${WECHAT_API_BASE_URL}/api/wechat-config`);
      const data = await res.json();
      if (data.success && data.config) {
        setSavedConfig(data.config);
        if (data.config.appId) {
          setConfig(prev => ({ ...prev, appId: data.config.appId }));
        }
      }
      
      // 获取ticket状态
      const ticketRes = await fetch(`${WECHAT_API_BASE_URL}/api/wechat-auth/ticket`);
      const ticketData = await ticketRes.json();
      if (ticketData.success && ticketData.ticket) {
        setTicket(ticketData.ticket);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${WECHAT_API_BASE_URL}/api/wechat-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '配置保存成功！' });
        fetchConfig();
      } else {
        setMessage({ type: 'error', text: data.message || '保存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: '已复制到剪贴板' });
  };

  const callbackUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/wechat/auth-event`
    : '';

  const authCallbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/wechat-auth/callback`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">微信第三方平台配置</h1>
        
        {/* 配置步骤 */}
        <Card>
          <CardHeader>
            <CardTitle>配置步骤</CardTitle>
            <CardDescription>请按以下步骤完成微信第三方平台配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <p className="font-medium">在微信公众平台配置URL</p>
                <p className="text-sm text-gray-500">登录 mp.weixin.qq.com → 设置与开发 → 基本配置 → 第三方平台</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <p className="font-medium">填写以下URL到微信后台</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-28">授权事件URL:</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">{callbackUrl}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(callbackUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-28">授权回调URL:</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">{authCallbackUrl}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(authCallbackUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <p className="font-medium">生成Token和EncodingAESKey</p>
                <p className="text-sm text-gray-500">在微信后台点击「随机生成」，然后复制到下方表单</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">4</span>
              <div>
                <p className="font-medium">提交配置并等待验证</p>
                <p className="text-sm text-gray-500">微信会向你的服务器发送验证请求</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 配置表单 */}
        <Card>
          <CardHeader>
            <CardTitle>填写配置信息</CardTitle>
            <CardDescription>请填写微信第三方平台的配置信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">AppID</label>
                <Input
                  placeholder="wx开头"
                  value={config.appId}
                  onChange={e => setConfig(prev => ({ ...prev, appId: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">AppSecret</label>
                <Input
                  type="password"
                  placeholder="32位密钥"
                  value={config.appSecret}
                  onChange={e => setConfig(prev => ({ ...prev, appSecret: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Token（消息校验）</label>
                <Input
                  placeholder="在微信后台生成"
                  value={config.token}
                  onChange={e => setConfig(prev => ({ ...prev, token: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">EncodingAESKey（消息加解密）</label>
                <Input
                  placeholder="43位密钥"
                  value={config.encodingAESKey}
                  onChange={e => setConfig(prev => ({ ...prev, encodingAESKey: e.target.value }))}
                />
              </div>
            </div>

            {message && (
              <div className={`flex items-center gap-2 p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {message.text}
              </div>
            )}

            <Button onClick={handleSave} disabled={loading || !config.appId || !config.appSecret}>
              {loading ? '保存中...' : '保存配置'}
            </Button>
          </CardContent>
        </Card>

        {/* 配置状态 */}
        <Card>
          <CardHeader>
            <CardTitle>配置状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {savedConfig?.appId ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm">AppID: {savedConfig?.appId || '未配置'}</span>
              </div>
              <div className="flex items-center gap-2">
                {savedConfig?.token ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm">Token: {savedConfig?.token ? '已配置' : '未配置'}</span>
              </div>
              <div className="flex items-center gap-2">
                {savedConfig?.encodingAESKey ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm">EncodingAESKey: {savedConfig?.encodingAESKey ? '已配置' : '未配置'}</span>
              </div>
              <div className="flex items-center gap-2">
                {ticket ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm">Ticket: {ticket ? '已接收' : '等待接收...'}</span>
              </div>
            </div>

            {savedConfig?.appId && savedConfig?.encodingAESKey && ticket && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-green-700 font-medium">✓ 配置完成！</p>
                <p className="text-sm text-green-600 mt-1">
                  你现在可以前往 
                  <a href="/official-account?tab=auth" className="underline mx-1">公众号管理</a> 
                  扫码授权绑定公众号
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 帮助链接 */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ExternalLink className="h-4 w-4" />
              <a 
                href="https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/Third_party_platform_appid.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                微信第三方平台开发文档
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
