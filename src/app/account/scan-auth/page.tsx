'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, Check, Loader2, Smartphone, AlertCircle } from 'lucide-react';

function ScanAuthContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const urlCode = searchParams.get('code');
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'completed' | 'error'>('loading');
  const [authCode, setAuthCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [message, setMessage] = useState('');
  
  // 通知后端授权码已被领取
  const notifyAuthCodeUsed = async (session: string) => {
    try {
      await fetch(`/api/wechat-auth/scan-status?sessionId=${session}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('通知失败:', error);
    }
  };
  
  useEffect(() => {
    if (sessionId && urlCode) {
      setAuthCode(urlCode);
      setStatus('ready');
      // 通知后端授权码已被领取
      notifyAuthCodeUsed(sessionId);
    } else {
      setStatus('error');
      setMessage('缺少授权参数');
    }
  }, [sessionId, urlCode]);
  
  // 复制授权码
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(authCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = authCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">正在准备授权...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-8 flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">授权参数错误</h2>
            <p className="text-gray-600 text-center">{message}</p>
            <Button 
              className="mt-6"
              onClick={() => window.close()}
            >
              关闭页面
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl">扫码成功</CardTitle>
          <CardDescription>
            请将以下授权码输入到文澜智作完成绑定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 授权码显示 */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-center text-white">
            <p className="text-sm opacity-80 mb-2">您的授权码</p>
            <p className="text-4xl font-bold tracking-wider font-mono">{authCode}</p>
            <p className="text-xs opacity-70 mt-2">有效期10分钟</p>
          </div>
          
          {/* 复制按钮 */}
          <Button 
            onClick={copyCode}
            className="w-full"
            size="lg"
          >
            {isCopied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                已复制
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                复制授权码
              </>
            )}
          </Button>
          
          {/* 说明 */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-2">授权步骤：</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>复制上方的授权码</li>
              <li>返回文澜智作账号管理页面</li>
              <li>在扫码授权页面输入授权码</li>
              <li>完成公众号绑定</li>
            </ol>
          </div>
          
          {/* 提示 */}
          <p className="text-xs text-center text-gray-500">
            请妥善保管授权码，不要泄露给他人
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ScanAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    }>
      <ScanAuthContent />
    </Suspense>
  );
}
