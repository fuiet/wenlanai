'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import WechatAuth from '@/components/wechat-auth';
import {
  UserCheck,
  Plus,
  Settings,
  CheckCircle,
  AlertCircle,
  Send
} from 'lucide-react';

// 模拟公众号数据
const mockAccounts = [
  {
    id: 1,
    name: '上岸的笔记',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=account1',
    appId: 'wxa36f34f5d6bd8c58',
    status: 'authorized', // authorized, unauthorized
    accountStatus: 'normal', // normal, abnormal
    groupName: '默认分组',
    createTime: '2024-12-15',
  },
];

const groups = [
  { id: 1, name: '默认分组', count: 1 },
];

export default function OfficialAccountPage() {
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isManageGroupDialogOpen, setIsManageGroupDialogOpen] = useState(false);
  const [isBatchSendDialogOpen, setIsBatchSendDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [authInfo, setAuthInfo] = useState<{ appId: string; appSecret: string; accessToken: string } | null>(null);

  // 模拟待推送文章数据
  const mockArticles = [
    {
      id: 1,
      title: '2024年低粉爆款文案：这3个技巧让你从0到10万粉',
      author: '文澜智作',
      digest: '如何通过精准定位和高质量内容快速涨粉？本文揭秘爆款公众号的运营秘诀...',
      content: '这里是文章的完整内容...',
      content_source_url: 'https://example.com/article/1',
    },
    {
      id: 2,
      title: 'AI写作工具测评：5款免费工具让你的写作效率翻倍',
      author: '文澜智作',
      digest: '对比5款热门AI写作工具，从功能、价格、易用性三个维度进行全面分析...',
      content: '这里是文章的完整内容...',
      content_source_url: 'https://example.com/article/2',
    },
  ];
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);

  const filteredAccounts = mockAccounts.filter(account => {
    if (selectedGroup === 'all') return true;
    return account.groupName === selectedGroup;
  });

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      // TODO: 实现添加分组的逻辑
      alert(`添加分组: ${newGroupName}`);
      setNewGroupName('');
    }
  };

  // 处理授权成功
  const handleAuthorized = (data: { appId: string; appSecret: string }) => {
    // TODO: 将授权信息保存到数据库或本地存储
    console.log('公众号授权成功:', data);
    setAuthInfo({ ...data, accessToken: '' });
    setIsAuthDialogOpen(false);
  };

  // 处理批量推送
  const handleBatchSend = async () => {
    if (!authInfo?.accessToken) {
      alert('请先授权公众号并获取access_token');
      return;
    }

    if (selectedArticles.length === 0) {
      alert('请至少选择一篇文章');
      return;
    }

    try {
      const articlesToSend = mockArticles
        .filter(article => selectedArticles.includes(article.id))
        .map(article => ({
          title: article.title,
          author: article.author,
          digest: article.digest,
          content: article.content,
          content_source_url: article.content_source_url,
        }));

      const response = await fetch('/api/wechat/batch-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: authInfo.accessToken,
          articles: articlesToSend,
          target: { isToAll: true },
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`推送成功！消息ID: ${result.data.msgId}`);
        setIsBatchSendDialogOpen(false);
        setSelectedArticles([]);
      } else {
        alert(`推送失败: ${result.error}`);
      }
    } catch {
      alert('推送失败，请检查网络连接');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 flex items-center">
            <UserCheck className="mr-3 h-8 w-8 text-orange-500" />
            公众号管理
          </h1>
          <p className="text-gray-600">管理您的授权公众号，批量推送文章 - 可实时编辑修改</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsBatchSendDialogOpen(true)}
            variant="outline"
            disabled={!authInfo}
            className={authInfo ? 'bg-green-50 text-green-700 border-green-200' : ''}
          >
            <Send className="mr-2 h-4 w-4" />
            批量推送
          </Button>
          <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <Plus className="mr-2 h-5 w-5" />
                授权公众号
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>授权公众号</DialogTitle>
                <DialogDescription>
                  填写您的微信公众号AppID和AppSecret，授权后即可批量推送文章
                </DialogDescription>
              </DialogHeader>
              <WechatAuth onAuthorized={handleAuthorized} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Panel - Group Filter */}
        <Card className="h-fit">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">分组筛选</h3>
            <p className="mb-4 text-sm text-gray-500">
              {groups.length} 个分组 · {mockAccounts.length} 个公众号
            </p>
            <div className="space-y-2">
              <Button
                variant={selectedGroup === 'all' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setSelectedGroup('all')}
              >
                {selectedGroup === 'all' ? (
                  <Badge className="mr-2 bg-orange-500">
                    {mockAccounts.length} 个
                  </Badge>
                ) : (
                  <span className="mr-2 text-sm text-gray-500">
                    {mockAccounts.length} 个
                  </span>
                )}
                全部公众号
              </Button>
              {groups.map((group) => (
                <Button
                  key={group.id}
                  variant={selectedGroup === group.name ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedGroup(group.name)}
                >
                  {selectedGroup === group.name ? (
                    <Badge className="mr-2 bg-orange-500">
                      {group.count} 个
                    </Badge>
                  ) : (
                    <span className="mr-2 text-sm text-gray-500">
                      {group.count} 个
                    </span>
                  )}
                  {group.name}
                </Button>
              ))}
            </div>
            <Dialog open={isManageGroupDialogOpen} onOpenChange={setIsManageGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="mt-4 w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  管理分组
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>管理分组</DialogTitle>
                  <DialogDescription>创建或编辑公众号分组</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="groupName">分组名称</Label>
                    <Input
                      id="groupName"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="例如：情感号矩阵"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsManageGroupDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleAddGroup}>
                      <Plus className="mr-2 h-4 w-4" />
                      添加分组
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Right Panel - Account List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              共 {filteredAccounts.length} 个公众号
            </h3>
          </div>

          {filteredAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCheck className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-gray-500">暂无授权公众号</p>
                <p className="mt-2 text-sm text-gray-400">点击&ldquo;授权公众号&rdquo;按钮开始使用</p>
              </CardContent>
            </Card>
          ) : (
            filteredAccounts.map((account) => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-16 w-16 border-2 border-orange-200">
                        <AvatarImage src={account.avatar} alt={account.name} />
                        <AvatarFallback className="bg-orange-500 text-white text-xl">
                          {account.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="mb-1 text-xl font-semibold text-gray-900">
                          {account.name}
                        </h4>
                        <p className="mb-3 text-sm text-gray-500 font-mono">
                          {account.appId}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="secondary"
                            className={account.status === 'authorized' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                          >
                            {account.status === 'authorized' ? (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                已授权
                              </>
                            ) : (
                              <>
                                <AlertCircle className="mr-1 h-3 w-3" />
                                未授权
                              </>
                            )}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={account.accountStatus === 'normal' ? 'border-orange-200 text-orange-700' : 'border-red-200 text-red-700'}
                          >
                            {account.accountStatus === 'normal' ? '正常' : '异常'}
                          </Badge>
                          <Badge variant="outline">{account.groupName}</Badge>
                          <span className="text-xs text-gray-400 flex items-center">
                            创建于 {account.createTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card className="mt-6 bg-gradient-to-br from-purple-50 to-orange-50 border-2">
        <CardContent className="py-6">
          <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            使用说明
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 授权公众号后，可以在智能生文页面直接将文章推送到草稿箱</li>
            <li>• 支持多公众号批量推送，方便账号矩阵运营</li>
            <li>• 可以创建分组，方便管理多个公众号</li>
            <li>• 授权信息安全存储，您可以随时取消授权</li>
          </ul>
        </CardContent>
      </Card>

      {/* 批量推送对话框 */}
      <Dialog open={isBatchSendDialogOpen} onOpenChange={setIsBatchSendDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>批量推送文章</DialogTitle>
            <DialogDescription>
              选择要推送的文章，系统将自动群发到您的公众号
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 文章列表 */}
            <div className="space-y-3">
              {mockArticles.map((article) => (
                <Card
                  key={article.id}
                  className={`cursor-pointer transition-colors ${
                    selectedArticles.includes(article.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'hover:border-orange-300'
                  }`}
                  onClick={() => {
                    setSelectedArticles(prev =>
                      prev.includes(article.id)
                        ? prev.filter(id => id !== article.id)
                        : [...prev, article.id]
                    );
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-orange-300 mt-1">
                        {selectedArticles.includes(article.id) && (
                          <CheckCircle className="h-3.5 w-3.5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{article.title}</h4>
                        <p className="text-sm text-gray-500 mb-2">{article.author}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{article.digest}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 推送按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsBatchSendDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleBatchSend}
                disabled={selectedArticles.length === 0}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Send className="mr-2 h-4 w-4" />
                推送 {selectedArticles.length} 篇文章
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
