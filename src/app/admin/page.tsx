'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Menu, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Download,
  PowerOff,
  Power,
  RefreshCw,
  LogOut,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import * as XLSX from 'xlsx';

// 生成 mock 用户数据
const generateMockUsers = () => {
  const users = [];
  const statuses = ['正常', '正常', '正常', '禁用']; // 3:1 比例
  const domains = ['qq.com', '163.com', 'gmail.com', '126.com', 'outlook.com'];
  
  for (let i = 1; i <= 100; i++) {
    const username = `用户${i.toString().padStart(3, '0')}`;
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const registerDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const lastLoginDaysAgo = Math.floor(Math.random() * 30);
    const lastLoginDate = new Date();
    lastLoginDate.setDate(lastLoginDate.getDate() - lastLoginDaysAgo);
    
    users.push({
      id: `U${i.toString().padStart(5, '0')}`,
      username,
      email: `${username.toLowerCase()}@${domain}`,
      registerTime: registerDate.toISOString().split('T')[0],
      lastLoginTime: lastLoginDate.toISOString().split('T')[0],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      articles: Math.floor(Math.random() * 50),
    });
  }
  return users;
};

// 生成 mock 文章数据
const mockArticles = [
  { id: 1, title: '如何在短视频时代抓住流量红利', author: '用户001', time: '2025-05-07', views: 12580 },
  { id: 2, title: '揭秘：月入过万的副业项目分享', author: '用户015', time: '2025-05-06', views: 9820 },
  { id: 3, title: '职场沟通技巧：让你少走十年弯路', author: '用户023', time: '2025-05-06', views: 8760 },
  { id: 4, title: '2025年最值得做的5个自媒体方向', author: '用户008', time: '2025-05-05', views: 15420 },
  { id: 5, title: '情感类公众号如何写出爆款文章', author: '用户042', time: '2025-05-05', views: 7630 },
  { id: 6, title: 'AI写作工具大盘点，提升效率10倍', author: '用户019', time: '2025-05-04', views: 21350 },
  { id: 7, title: '从0开始：公众号涨粉全攻略', author: '用户067', time: '2025-05-04', views: 11200 },
  { id: 8, title: '读书分享：这几本书改变了我的认知', author: '用户033', time: '2025-05-03', views: 6450 },
  { id: 9, title: '热点追踪：近期爆款文章分析', author: '用户051', time: '2025-05-03', views: 18900 },
  { id: 10, title: '个人IP打造：普通人也能年入百万', author: '用户078', time: '2025-05-02', views: 25600 },
];

// 模拟当前管理员
const currentAdmin = {
  username: 'admin',
  role: '超级管理员'
};

export default function AdminPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState(generateMockUsers());
  const [filteredUsers, setFilteredUsers] = useState(generateMockUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId: string; action: string }>({ open: false, userId: '', action: '' });
  const [todayNewUsers] = useState(() => 5 + (generateMockUsers().length % 10));
  const pageSize = 20;

  // 计算统计数据
  const totalUsers = users.length;
  const activeUsers = users.filter(u => {
    const lastLogin = new Date(u.lastLoginTime);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return lastLogin >= weekAgo;
  }).length;
  const disabledUsers = users.filter(u => u.status === '禁用').length;

  // 搜索过滤
  useEffect(() => {
    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchQuery, users]);

  // 分页数据
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 导出 Excel
  const exportToExcel = () => {
    const exportData = filteredUsers.map(user => ({
      '用户ID': user.id,
      '用户名': user.username,
      '邮箱': user.email,
      '注册时间': user.registerTime,
      '最后登录': user.lastLoginTime,
      '状态': user.status,
      '文章数': user.articles,
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '用户列表');
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }
    ];
    
    XLSX.writeFile(wb, `用户列表_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 禁用/启用用户
  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        return { ...user, status: user.status === '正常' ? '禁用' : '正常' };
      }
      return user;
    }));
  };

  // 重置密码
  const resetPassword = (userId: string) => {
    alert(`用户 ${userId} 的密码已重置为默认密码：123456`);
  };

  // 确认对话框操作
  const handleConfirm = () => {
    if (confirmDialog.action === 'disable') {
      toggleUserStatus(confirmDialog.userId);
    }
    setConfirmDialog({ open: false, userId: '', action: '' });
  };

  // 退出登录
  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* 侧边栏 */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 fixed h-full`}>
        {/* Logo 区域 */}
        <div className="h-16 flex items-center justify-center border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-500">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-white" />
              <span className="text-white font-bold text-lg">后台管理</span>
            </div>
          )}
          {sidebarCollapsed && <Shield className="w-6 h-6 text-white" />}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">仪表盘</span>}
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeTab === 'users' 
                ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">用户管理</span>}
          </button>
          
          <button
            onClick={() => setActiveTab('content')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeTab === 'content' 
                ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">内容概览</span>}
          </button>
        </nav>

        {/* 折叠按钮 */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-4 border-t border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center"
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* 主内容区 */}
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        {/* 顶部栏 */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800">文澜智作 · 后台管理</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{currentAdmin.username}</span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-400">{currentAdmin.role}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="w-4 h-4 mr-1" />
              退出登录
            </Button>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 仪表盘 */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">数据概览</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">总注册用户</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{totalUsers}</div>
                    <p className="text-xs opacity-75 mt-1">较上月 +12.5%</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">今日新增</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{todayNewUsers}</div>
                    <p className="text-xs opacity-75 mt-1">较昨日 +3</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">活跃用户</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{activeUsers}</div>
                    <p className="text-xs opacity-75 mt-1">近7天有登录</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium opacity-90">禁用用户</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{disabledUsers}</div>
                    <p className="text-xs opacity-75 mt-1">占总用户 {(disabledUsers / totalUsers * 100).toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* 快捷操作 */}
              <Card>
                <CardHeader>
                  <CardTitle>快捷操作</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button onClick={() => setActiveTab('users')}>
                    <Users className="w-4 h-4 mr-2" />
                    管理用户
                  </Button>
                  <Button variant="outline" onClick={exportToExcel}>
                    <Download className="w-4 h-4 mr-2" />
                    导出用户数据
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 用户管理 */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">用户管理</h2>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="搜索用户名或邮箱..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button onClick={exportToExcel}>
                    <Download className="w-4 h-4 mr-2" />
                    导出Excel
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-28">用户ID</TableHead>
                        <TableHead>用户名</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead className="w-28">注册时间</TableHead>
                        <TableHead className="w-28">最后登录</TableHead>
                        <TableHead className="w-20">状态</TableHead>
                        <TableHead className="w-20">文章数</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-sm">{user.id}</TableCell>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell className="text-slate-500">{user.email}</TableCell>
                          <TableCell>{user.registerTime}</TableCell>
                          <TableCell>{user.lastLoginTime}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === '正常' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {user.status}
                            </span>
                          </TableCell>
                          <TableCell>{user.articles}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setConfirmDialog({ 
                                    open: true, 
                                    userId: user.id, 
                                    action: user.status === '正常' ? 'disable' : 'enable' 
                                  });
                                }}
                                className={user.status === '正常' ? 'text-orange-500 hover:text-orange-600' : 'text-green-500 hover:text-green-600'}
                              >
                                {user.status === '正常' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetPassword(user.id)}
                                className="text-blue-500 hover:text-blue-600"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 分页 */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  共 {filteredUsers.length} 条记录，第 {currentPage}/{totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    首页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    末页
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 内容概览 */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">内容概览</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle>最近生成的文章</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead>标题</TableHead>
                        <TableHead className="w-28">作者</TableHead>
                        <TableHead className="w-28">时间</TableHead>
                        <TableHead className="w-24 text-right">阅读量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockArticles.map((article) => (
                        <TableRow key={article.id}>
                          <TableCell className="font-mono text-sm">{article.id}</TableCell>
                          <TableCell className="font-medium max-w-md truncate">{article.title}</TableCell>
                          <TableCell className="text-slate-500">{article.author}</TableCell>
                          <TableCell>{article.time}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-blue-600 font-medium">{article.views.toLocaleString()}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* 确认对话框 */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, userId: '', action: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认操作</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              {confirmDialog.action === 'disable' 
                ? `确定要禁用用户 ${confirmDialog.userId} 吗？禁用后该用户将无法登录。`
                : `确定要启用用户 ${confirmDialog.userId} 吗？`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, userId: '', action: '' })}>
              取消
            </Button>
            <Button onClick={handleConfirm}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
