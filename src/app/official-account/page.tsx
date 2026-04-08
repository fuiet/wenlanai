'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle
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
  const [newGroupName, setNewGroupName] = useState('');

  const filteredAccounts = mockAccounts.filter(account => {
    if (selectedGroup === 'all') return true;
    return account.groupName === selectedGroup;
  });

  const handleAddAccount = () => {
    // TODO: 实现授权公众号的逻辑
    alert('授权功能需要对接微信开放平台');
    setIsAuthDialogOpen(false);
  };

  const handleEditAccount = () => {
    // TODO: 实现编辑公众号的逻辑
    alert('编辑公众号功能');
  };

  const handleDeleteAccount = () => {
    if (confirm('确定要删除这个公众号吗？')) {
      // TODO: 实现删除公众号的逻辑
      alert('删除公众号功能');
    }
  };

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      // TODO: 实现添加分组的逻辑
      alert(`添加分组: ${newGroupName}`);
      setNewGroupName('');
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
          <p className="text-gray-600">管理您的授权公众号，批量推送文章</p>
        </div>
        <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
              <Plus className="mr-2 h-5 w-5" />
              授权公众号
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>授权公众号</DialogTitle>
              <DialogDescription>
                授权后，您可以将文章直接推送到公众号草稿箱
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-blue-500" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">授权说明</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>需要您拥有公众号的管理员权限</li>
                      <li>授权后仅能操作文章推送，无法修改公众号设置</li>
                      <li>您可以随时取消授权</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={handleAddAccount}
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  开始授权
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAccount()}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAccount()}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
    </div>
  );
}
