'use client';

import { Loader2 } from 'lucide-react';

// Loading fallback component
function AccountLoading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">公众号管理</h1>
          <p className="text-sm text-gray-500">绑定您的微信公众号，开启一键推送功能</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}

// Dynamic import to avoid static prerendering issues with useSearchParams
import dynamic from 'next/dynamic';

const AccountContent = dynamic(
  () => import('./AccountContent'),
  { 
    ssr: false,
    loading: () => <AccountLoading />
  }
);

// Main page component
export default function AccountPage() {
  return <AccountContent />;
}
