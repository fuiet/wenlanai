'use client';

import { useState } from 'react';
import { WECHAT_API_BASE_URL } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Circle, 
  Copy, 
  Check,
  ExternalLink,
  Settings,
  Key,
  Globe,
  ArrowRight,
  AlertCircle,
  BookOpen
} from 'lucide-react';

export default function WechatSetupGuide() {
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    appId: '',
    appSecret: '',
    token: '',
    encodingAESKey: '',
  });

  // 当前域名
  const domain = typeof window !== 'undefined' 
    ? window.location.origin.replace('https://', '').replace('http://', '') 
    : 'your-domain.com';

  // 需要配置的URL
  const urls = {
    authEvent: `https://${domain}/api/wechat/auth-event`,
    messageReceive: `https://${domain}/api/wechat/message`,
    authPage: `https://${domain}/official-account?tab=auth`,
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = [
    {
      id: 1,
      title: '创建第三方平台',
      description: '在微信公众平台创建第三方平台',
      status: step > 1 ? 'completed' : step === 1 ? 'current' : 'pending',
    },
    {
      id: 2,
      title: '配置服务器信息',
      description: '填写授权事件接收URL和消息接收URL',
      status: step > 2 ? 'completed' : step === 2 ? 'current' : 'pending',
    },
    {
      id: 3,
      title: '保存平台配置',
      description: '将AppID和AppSecret保存到系统',
      status: step > 3 ? 'completed' : step === 3 ? 'current' : 'pending',
    },
    {
      id: 4,
      title: '绑定公众号',
      description: '通过扫码授权绑定公众号',
      status: step >= 4 ? 'current' : 'pending',
    },
  ];

  const handleSaveConfig = async () => {
    if (!config.appId || !config.appSecret) {
      alert('请填写AppID和AppSecret');
      return;
    }

    try {
      const response = await fetch(`${WECHAT_API_BASE_URL}/api/wechat-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const result = await response.json();
      
      if (result.success) {
        alert('配置保存成功！');
        setStep(4);
      } else {
        alert(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请稍后重试');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">微信第三方平台接入指南</h1>
        <p className="text-muted-foreground">
          按照以下步骤配置，即可实现推送到用户公众号草稿箱
        </p>
      </div>

      {/* 进度条 */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, index) => (
          <div key={s.id} className="flex items-center">
            <div 
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
                ${s.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 
                  s.status === 'current' ? 'bg-primary border-primary text-white' : 
                  'border-muted-foreground/30 text-muted-foreground'}`}
              onClick={() => setStep(s.id)}
            >
              {s.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : s.id}
            </div>
            <div className="ml-3 hidden md:block">
              <p className="font-medium text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 mx-4 text-muted-foreground/50 hidden md:block" />
            )}
          </div>
        ))}
      </div>

      {/* 步骤1：创建第三方平台 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              步骤1：创建第三方平台
            </CardTitle>
            <CardDescription>
              前往微信公众平台创建第三方平台账号
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>前提条件</AlertTitle>
              <AlertDescription>
                需要一个已认证的服务号作为第三方平台的绑定账号
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm">1. 登录微信公众平台：</p>
              <Button asChild variant="outline" className="w-fit">
                <a href="https://mp.weixin.qq.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  打开微信公众平台
                </a>
              </Button>

              <p className="text-sm">2. 进入「设置与开发」→「基本配置」→「第三方平台」</p>
              
              <p className="text-sm">3. 点击「创建第三方平台」，填写基本信息：</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                <li>平台名称：你的应用名称</li>
                <li>平台简介：简要描述平台功能</li>
                <li>平台图标：上传应用logo</li>
              </ul>
            </div>

            <div className="pt-4">
              <Button onClick={() => setStep(2)}>
                下一步：配置服务器信息
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤2：配置服务器信息 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              步骤2：配置服务器信息
            </CardTitle>
            <CardDescription>
              在第三方平台设置中填写以下URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 授权发起页域名 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Badge variant="outline">必填</Badge>
                授权发起页域名
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={domain} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(domain, 'domain')}
                >
                  {copied === 'domain' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                只填写域名，不带 https:// 和路径
              </p>
            </div>

            {/* 授权事件接收URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Badge variant="outline">必填</Badge>
                授权事件接收URL
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={urls.authEvent} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(urls.authEvent, 'authEvent')}
                >
                  {copied === 'authEvent' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                用于接收授权事件推送（component_verify_ticket）
              </p>
            </div>

            {/* 消息与事件接收URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Badge variant="outline">必填</Badge>
                消息与事件接收URL
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={urls.messageReceive} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(urls.messageReceive, 'message')}
                >
                  {copied === 'message' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                用于接收公众号消息和事件推送，填写前缀即可（$APPID$会自动替换）
              </p>
            </div>

            {/* Token和EncodingAESKey */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge variant="outline">必填</Badge>
                  Token（令牌）
                </Label>
                <Input 
                  placeholder="任意填写，如：wenlan2024"
                  value={config.token}
                  onChange={(e) => setConfig({...config, token: e.target.value})}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Badge variant="outline">必填</Badge>
                  EncodingAESKey
                </Label>
                <Input 
                  placeholder="点击随机生成"
                  value={config.encodingAESKey}
                  onChange={(e) => setConfig({...config, encodingAESKey: e.target.value})}
                  className="font-mono"
                />
              </div>
            </div>

            <Alert>
              <BookOpen className="h-4 w-4" />
              <AlertTitle>配置说明</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Token和EncodingAESKey需要在微信后台点击「随机生成」</li>
                  <li>填写完成后点击「提交」，微信会向你的服务器发送验证请求</li>
                  <li>验证通过后，复制AppID和AppSecret到下一步</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                上一步
              </Button>
              <Button onClick={() => setStep(3)}>
                下一步：保存配置
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤3：保存配置 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              步骤3：保存平台配置
            </CardTitle>
            <CardDescription>
              将第三方平台的AppID和AppSecret保存到系统
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Badge variant="outline">必填</Badge>
                第三方平台AppID
              </Label>
              <Input 
                placeholder="wx开头，如：wx1234567890abcdef"
                value={config.appId}
                onChange={(e) => setConfig({...config, appId: e.target.value})}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Badge variant="outline">必填</Badge>
                第三方平台AppSecret
              </Label>
              <Input 
                type="password"
                placeholder="32位密钥"
                value={config.appSecret}
                onChange={(e) => setConfig({...config, appSecret: e.target.value})}
                className="font-mono"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>获取方式</AlertTitle>
              <AlertDescription>
                在微信公众平台的「设置与开发」→「基本配置」→「第三方平台」中查看
              </AlertDescription>
            </Alert>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                上一步
              </Button>
              <Button onClick={handleSaveConfig}>
                保存配置
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤4：绑定公众号 */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              步骤4：绑定公众号
            </CardTitle>
            <CardDescription>
              通过扫码授权绑定公众号，即可推送文章到草稿箱
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>配置完成！</AlertTitle>
              <AlertDescription>
                第三方平台配置成功，现在可以绑定公众号了
              </AlertDescription>
            </Alert>

            <div className="text-center py-6">
              <Button asChild size="lg">
                <a href="/official-account?tab=auth">
                  前往绑定公众号
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">绑定后可以：</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  将生成的文章推送到公众号草稿箱
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  管理多个已授权的公众号
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  一键推送，无需复制粘贴
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 常见问题 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>常见问题</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Q: 验证URL失败怎么办？</p>
              <p className="text-muted-foreground">A: 确保服务器已启动，URL可以正常访问。检查是否使用了https协议。</p>
            </div>
            <div>
              <p className="font-medium">Q: 推送失败显示「请先绑定公众号」？</p>
              <p className="text-muted-foreground">A: 需要先通过扫码授权绑定公众号，在「公众号」页面进行授权。</p>
            </div>
            <div>
              <p className="font-medium">Q: 如何获取component_verify_ticket？</p>
              <p className="text-muted-foreground">A: 配置好授权事件接收URL后，微信会每10分钟推送一次ticket到该URL。</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
