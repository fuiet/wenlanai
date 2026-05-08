'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertCircle, Smartphone, ArrowRight } from 'lucide-react';

function ScanCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const ticket = searchParams.get('ticket');
  
  useEffect(() => {
    const processCallback = async () => {
      if (!ticket) {
        setStatus('error');
        setMessage('缺少授权凭证');
        return;
      }
      
      try {
        // 调用API验证ticket并完成授权
        const response = await fetch('/api/wechat-auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setStatus('success');
          setMessage(result.message || '授权成功！');
          
          // 3秒后跳转到账号管理页面
          setTimeout(() => {
            router.push('/account?success=1');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.message || '授权失败');
        }
      } catch (error) {
        console.error('处理授权回调失败:', error);
        setStatus('error');
        setMessage('处理授权失败，请稍后重试');
      }
    };
    
    processCallback();
  }, [ticket, router]);
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">正在处理授权...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">授权失败</h2>
            <p className="text-gray-600 text-center mb-6">{message}</p>
            <Button onClick={() => router.push('/account?tab=scan')}>
              返回重试
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
          <CardTitle className="text-2xl">授权成功</CardTitle>
          <CardDescription>
            公众号已成功绑定，即将跳转到管理页面...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <Smartphone className="h-5 w-5" />
            <span>即将自动跳转...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
          <Button 
            onClick={() => router.push('/account?success=1')}
            className="w-full"
          >
            立即前往
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ScanCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    }>
      <ScanCallbackContent />
    </Suspense>
  );
}
