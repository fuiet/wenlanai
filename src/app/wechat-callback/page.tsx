'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function WechatCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // 获取微信回调参数
      // 宝塔后端会处理授权，这里只负责显示结果
      const authCode = searchParams.get('auth_code');
      const errorCode = searchParams.get('error');
      const success = searchParams.get('success');
      
      if (success === 'true' || authCode) {
        // 授权成功
        setStatus('success');
        setMessage('授权成功！您可以关闭此页面，或返回公众号管理页面查看。');
      } else if (errorCode) {
        // 授权失败
        setStatus('error');
        const errorDesc = searchParams.get('error_description') || '授权失败，请重试';
        setMessage(errorDesc);
      } else {
        // 未知状态，默认显示成功
        setStatus('success');
        setMessage('授权处理完成！您可以关闭此页面。');
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">正在处理授权...</h2>
            <p className="text-gray-500">请稍候</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">授权成功！</h2>
            <p className="text-gray-500">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">授权失败</h2>
            <p className="text-gray-500">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function WechatCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载中...</h2>
        </div>
      </div>
    }>
      <WechatCallbackContent />
    </Suspense>
  );
}
