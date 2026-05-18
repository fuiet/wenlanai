import { NextRequest, NextResponse } from 'next/server';

// 宝塔后端地址
const BACKEND_URL = process.env.WECHAT_BACKEND_URL || 'https://wenlanai.top';

/**
 * 获取已授权公众号列表
 * 通过宝塔后端获取已授权的公众号信息
 * 
 * 流程：
 * 1. 先获取 component_access_token
 * 2. 调用微信API获取授权账号列表
 * 
 * 注意：微信API需要IP白名单，如果失败则返回空列表
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 获取 component_access_token
    const tokenResponse = await fetch(`${BACKEND_URL}/wechat/component_token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '获取 component_token 失败，请检查宝塔后端服务',
      });
    }

    const tokenData = await tokenResponse.json();
    const componentToken = tokenData.token;

    if (!componentToken) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'component_token 为空，请检查宝塔后端配置',
      });
    }

    // 2. 调用微信API获取授权账号列表
    // 注意：这里需要使用第三方平台的 component_appid
    const componentAppid = 'wx95ba24e77fbd313f'; // 从宝塔后端获取
    
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_list?component_access_token=${componentToken}`;
    
    const listResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        component_appid: componentAppid,
        offset: 0,
        count: 100
      }),
    });

    const listResult = await listResponse.json();
    
    // 处理微信API错误
    if (listResult.errcode) {
      // IP白名单错误或其他API错误
      if (listResult.errcode === 61004) {
        return NextResponse.json({
          success: true,
          data: [],
          message: '当前服务器IP未在微信第三方平台白名单中，请联系管理员配置',
          needIpWhitelist: true,
        });
      }
      
      console.error('获取授权账号列表失败:', listResult);
      return NextResponse.json({
        success: true,
        data: [],
        message: listResult.errmsg || '获取授权账号列表失败',
        errcode: listResult.errcode
      });
    }

    // 3. 获取每个账号的详细信息
    const accounts = listResult.authorizer_list || [];
    
    return NextResponse.json({
      success: true,
      data: accounts.map((acc: { authorizer_appid: string; nick_name?: string; service_type_info?: unknown; verify_type_info?: unknown; user_name?: string; alias?: string; qrcode_url?: string; }) => ({
        appid: acc.authorizer_appid,
        nickname: acc.nick_name || '未知公众号',
        service_type_info: acc.service_type_info,
        verify_type_info: acc.verify_type_info,
        user_name: acc.user_name || '',
        alias: acc.alias || '',
      })),
      message: '获取已授权公众号列表成功',
      total: listResult.total_count || accounts.length
    });
    
  } catch (error) {
    console.error('获取已授权公众号列表失败:', error);
    
    // 返回空列表，前端会提示用户先授权
    return NextResponse.json({
      success: true,
      data: [],
      message: '获取授权账号列表失败，请检查网络连接',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
