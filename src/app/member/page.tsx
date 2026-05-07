'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  nickname: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  wechat_nickname?: string;
  created_at?: string;
  last_login_at?: string;
}

interface Profile {
  id: string;
  user_id: string;
  username?: string;
  phone?: string;
  avatar?: string;
  gender?: string;
  birthday?: string;
  bio?: string;
  company?: string;
  position?: string;
  website?: string;
  wechat?: string;
  qq?: string;
  vip_level?: number;
  vip_expire_at?: string;
  points?: number;
}

export default function MemberCenterPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // 表单状态
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    username: '',
    gender: '未知',
    birthday: '',
    bio: '',
    company: '',
    position: '',
    website: '',
    wechat: '',
    qq: ''
  });

  // 加载用户信息
  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const res = await fetch('/api/member/profile', {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        // API 返回的是 data 直接就是用户信息
        const userData = data.data;
        setUser({
          id: userData.id,
          email: userData.email || '',
          nickname: userData.nickname || '',
          role: userData.role || 'member',
          phone: userData.phone,
          avatar_url: userData.avatar,
          wechat_nickname: userData.wechat,
          created_at: userData.createdAt,
          last_login_at: userData.lastLoginAt
        });
        setProfile({
          id: userData.id,
          user_id: userData.id,
          username: userData.username,
          phone: userData.phone,
          avatar: userData.avatar,
          gender: userData.gender,
          birthday: userData.birthday,
          bio: userData.bio,
          company: userData.company,
          position: userData.position,
          website: userData.website,
          wechat: userData.wechat,
          qq: userData.qq,
          vip_level: userData.vipLevel,
          vip_expire_at: userData.vipExpireAt,
          points: userData.points
        });
        // 填充表单
        setFormData({
          nickname: userData.nickname || '',
          phone: userData.phone || '',
          username: userData.username || '',
          gender: userData.gender || '未知',
          birthday: userData.birthday || '',
          bio: userData.bio || '',
          company: userData.company || '',
          position: userData.position || '',
          website: userData.website || '',
          wechat: userData.wechat || '',
          qq: userData.qq || ''
        });
      } else {
        // 未登录，跳转到登录页
        router.push('/auth');
        return;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      toast({ title: '加载失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/member/logout', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: '已退出登录' });
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      toast({ title: '退出失败', variant: 'destructive' });
    }
  };

  // 保存资料
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.data.user);
        setProfile(data.data.profile);
        toast({ title: '保存成功', description: '您的资料已更新' });
      } else {
        toast({ title: '保存失败', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // 修改密码表单
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChangePassword = async () => {
    if (passwordData.newPassword.length < 6) {
      toast({ title: '密码至少6位', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: '两次密码不一致', variant: 'destructive' });
      return;
    }

    try {
      // 简化版：实际项目中需要验证旧密码
      toast({ title: '功能开发中', description: '请联系客服修改密码' });
    } catch (error) {
      toast({ title: '修改失败', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">请先登录</p>
            <Button onClick={() => router.push('/auth')}>去登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold">会员中心</h1>
        <p className="text-sm text-muted-foreground">管理您的个人资料和账户设置</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* 左侧用户卡片 */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={user.avatar_url || profile?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl">
                    {user.nickname?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold">{user.nickname || user.email.split('@')[0]}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  VIP {profile?.vip_level || 1}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>注册时间：{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
                  <p>最后登录：{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '-'}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-6 w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  退出登录
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 账户安全提示 */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <span className="text-muted-foreground">账户安全：未绑定手机</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧设置区域 */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">基本资料</TabsTrigger>
              <TabsTrigger value="contact">联系方式</TabsTrigger>
              <TabsTrigger value="security">账户安全</TabsTrigger>
            </TabsList>

            {/* 基本资料 */}
            <TabsContent value="profile" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>基本资料</CardTitle>
                  <CardDescription>修改您的个人基本信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nickname">昵称</Label>
                      <Input 
                        id="nickname" 
                        value={formData.nickname}
                        onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                        placeholder="请输入昵称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名</Label>
                      <Input 
                        id="username" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="请输入用户名"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">性别</Label>
                      <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="男">男</SelectItem>
                          <SelectItem value="女">女</SelectItem>
                          <SelectItem value="未知">保密</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday">生日</Label>
                      <Input 
                        id="birthday" 
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">公司</Label>
                      <Input 
                        id="company" 
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        placeholder="请输入公司名称"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">职位</Label>
                      <Input 
                        id="position" 
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                        placeholder="请输入您的职位"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">个人简介</Label>
                    <Textarea 
                      id="bio" 
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="请简单介绍一下自己"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? '保存中...' : '保存修改'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 联系方式 */}
            <TabsContent value="contact" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>联系方式</CardTitle>
                  <CardDescription>管理您的联系方式信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="请输入手机号"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wechat">微信号</Label>
                    <Input 
                      id="wechat" 
                      value={formData.wechat}
                      onChange={(e) => setFormData({...formData, wechat: e.target.value})}
                      placeholder="请输入微信号"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qq">QQ号</Label>
                    <Input 
                      id="qq" 
                      value={formData.qq}
                      onChange={(e) => setFormData({...formData, qq: e.target.value})}
                      placeholder="请输入QQ号"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">个人网站</Label>
                    <Input 
                      id="website" 
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? '保存中...' : '保存修改'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 账户安全 */}
            <TabsContent value="security" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>账户安全</CardTitle>
                  <CardDescription>管理您的账户密码和安全设置</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>登录邮箱</Label>
                    <Input value={user.email} disabled className="bg-muted" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">当前密码</Label>
                    <Input 
                      id="oldPassword" 
                      type="password"
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                      placeholder="请输入当前密码"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新密码</Label>
                    <Input 
                      id="newPassword" 
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="请输入新密码（至少6位）"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">确认密码</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="请再次输入新密码"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleChangePassword}>
                      修改密码
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
