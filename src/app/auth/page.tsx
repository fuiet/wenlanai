'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/hooks/use-toast';
import { MessageCircle, QrCode, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [qrcodeUrl, setQrcodeUrl] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'waiting' | 'scanned' | 'confirmed' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('正在生成二维码...');
  const [refreshKey, setRefreshKey] = useState(0);

  // 检查登录状态
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // 检查是否已登录
  const checkLoginStatus = async () => {
    try {
      const res = await fetch('/api/auth/login');
      const data = await res.json();
      if (data.loggedIn) {
        router.push('/');
      }
    } catch {
      // 未登录，继续
    }
  };

  // 生成二维码
  useEffect(() => {
    generateQrcode();
  }, [refreshKey]);

  // 轮询扫码状态
  useEffect(() => {
    if (!sessionId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/auth/wechat/callback?session=${sessionId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          setStatus('confirmed');
          setStatusMessage('登录成功！正在跳转...');
          toast({ title: '登录成功' });
          setTimeout(() => {
            router.push('/');
          }, 1000);
          return;
        }

        if (data.status === 'scanned') {
          setStatus('scanned');
          setStatusMessage('请在手机上确认登录');
        }

        if (data.status === 'expired') {
          setStatus('error');
          setStatusMessage('二维码已过期，请刷新重试');
        }
      } catch {
        // 继续轮询
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [sessionId, router, toast]);

  // 生成二维码
  const generateQrcode = async () => {
    try {
      setStatus('loading');
      setStatusMessage('正在生成二维码...');
      setQrcodeUrl('');
      setSessionId('');

      const res = await fetch('/api/auth/wechat/qrcode');
      const data = await res.json();

      if (data.success) {
        setQrcodeUrl(data.qrcodeUrl);
        setSessionId(data.sessionId);
        setStatus('waiting');
        setStatusMessage('请使用微信扫描二维码');
      } else {
        setStatus('error');
        setStatusMessage(data.message || '生成二维码失败');
      }
    } catch {
      setStatus('error');
      setStatusMessage('网络错误，请重试');
    }
  };

  // 刷新二维码
  const refreshQrcode = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">文澜智作</CardTitle>
          <CardDescription>AI自媒体爆款创作系统</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-6">微信扫码登录</h2>

          {/* 二维码区域 */}
          <div className="relative bg-white p-4 rounded-lg border-2 border-dashed border-gray-200 mb-6">
            {qrcodeUrl ? (
              <img
                src={qrcodeUrl}
                alt="登录二维码"
                className="w-64 h-64"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-300 animate-pulse" />
              </div>
            )}

            {/* 状态遮罩 */}
            {status !== 'waiting' && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-lg">
                {status === 'loading' && (
                  <>
                    <QrCode className="w-16 h-16 text-gray-400 animate-pulse mb-2" />
                    <p className="text-gray-500">{statusMessage}</p>
                  </>
                )}
                {status === 'scanned' && (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                    <p className="text-green-600 font-medium">{statusMessage}</p>
                  </>
                )}
                {status === 'confirmed' && (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                    <p className="text-green-600 font-medium">{statusMessage}</p>
                  </>
                )}
                {status === 'error' && (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mb-2" />
                    <p className="text-red-600">{statusMessage}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshQrcode}
                      className="mt-4"
                    >
                      刷新二维码
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 状态说明 */}
          <div className="text-center text-sm text-gray-500 mb-6">
            {status === 'waiting' && (
              <p>请使用微信扫描二维码登录</p>
            )}
            {status === 'scanned' && (
              <p className="text-orange-500">请在微信中点击"确认登录"</p>
            )}
            {status === 'confirmed' && (
              <p className="text-green-500">登录成功！</p>
            )}
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <MessageCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">登录说明</p>
                <ul className="mt-1 space-y-1 text-blue-600">
                  <li>1. 打开微信扫一扫</li>
                  <li>2. 扫描右侧二维码</li>
                  <li>3. 在手机上确认登录</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 刷新按钮 */}
          {status === 'waiting' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshQrcode}
              className="mt-4"
            >
              刷新二维码
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
