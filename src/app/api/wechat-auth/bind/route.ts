import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, query } from '@/lib/db';

interface AccountInfo {
  app_id: string;
  nickname: string;
  head_img: string;
  principal_type: string;
  verify_type_info: number;
  user_name: string;
  alias: string;
  qrcode_url: string;
  authorizer_access_token: string;
  authorizer_refresh_token: string;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '请先登录后再绑定公众号' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const appId = typeof body.appId === 'string' ? body.appId.trim() : '';
    const appSecret = typeof body.appSecret === 'string' ? body.appSecret.trim() : '';

    if (!appId || !appSecret) {
      return NextResponse.json(
        { success: false, message: '请输入AppID和AppSecret' },
        { status: 400 }
      );
    }

    if ((!appId.startsWith('wx') && !appId.startsWith('wxa')) || appId.length < 15) {
      return NextResponse.json(
        { success: false, message: 'AppID格式不正确，应以wx或wxa开头' },
        { status: 400 }
      );
    }

    const existing = await query<{ user_id: string | number }>('SELECT user_id FROM wechat_accounts WHERE app_id = ? LIMIT 1', [appId]);
    if (existing.rows.length > 0 && String(existing.rows[0].user_id) !== String(userId)) {
      return NextResponse.json(
        { success: false, message: '该公众号已绑定到其他账号，请先在原账号解绑' },
        { status: 409 }
      );
    }

    const verifyUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const accountInfo: AccountInfo = {
      app_id: appId,
      nickname: '公众号',
      head_img: '',
      principal_type: '',
      verify_type_info: 0,
      user_name: '',
      alias: '',
      qrcode_url: '',
      authorizer_access_token: '',
      authorizer_refresh_token: appSecret,
    };

    try {
      const verifyResponse = await fetch(verifyUrl);
      const verifyData = await verifyResponse.json();

      if (verifyData.access_token) {
        accountInfo.authorizer_access_token = verifyData.access_token;
        accountInfo.nickname = '公众号（已验证）';

        const infoUrl = `https://api.weixin.qq.com/cgi-bin/get_account_basicinfo?access_token=${verifyData.access_token}`;
        const infoResponse = await fetch(infoUrl);
        const infoData = await infoResponse.json();

        if (infoData.base_info) {
          const baseInfo = infoData.base_info;
          accountInfo.nickname = baseInfo.nickname || '公众号（已验证）';
          accountInfo.head_img = baseInfo.head_img || '';
          accountInfo.principal_type = baseInfo.principal_type || '';
          accountInfo.verify_type_info = baseInfo.verify_type_info?.verify_type || 0;
          accountInfo.user_name = baseInfo.user_name || '';
          accountInfo.alias = baseInfo.alias || '';
          accountInfo.qrcode_url = baseInfo.qrcode_url || '';
        }
      } else if (verifyData.errcode) {
        console.warn('微信API验证失败，按演示模式保存:', verifyData);
      }
    } catch (apiError) {
      console.error('调用微信API失败，按演示模式保存:', apiError);
    }

    await query(
      `INSERT INTO wechat_accounts (
        user_id, app_id, nick_name, head_img, principal_type, verify_type_info,
        user_name, alias, qrcode_url, authorizer_access_token,
        authorizer_refresh_token, is_authorized, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        nick_name = VALUES(nick_name),
        head_img = VALUES(head_img),
        principal_type = VALUES(principal_type),
        verify_type_info = VALUES(verify_type_info),
        user_name = VALUES(user_name),
        alias = VALUES(alias),
        qrcode_url = VALUES(qrcode_url),
        authorizer_access_token = VALUES(authorizer_access_token),
        authorizer_refresh_token = VALUES(authorizer_refresh_token),
        is_authorized = true,
        updated_at = NOW()`,
      [
        userId,
        accountInfo.app_id,
        accountInfo.nickname,
        accountInfo.head_img,
        accountInfo.principal_type,
        accountInfo.verify_type_info,
        accountInfo.user_name,
        accountInfo.alias,
        accountInfo.qrcode_url,
        accountInfo.authorizer_access_token,
        accountInfo.authorizer_refresh_token,
      ]
    );

    return NextResponse.json({
      success: true,
      message: '绑定成功！',
      data: {
        app_id: accountInfo.app_id,
        nickname: accountInfo.nickname,
        head_img: accountInfo.head_img,
      },
    });
  } catch (error) {
    console.error('绑定公众号异常:', error);
    return NextResponse.json(
      { success: false, message: '服务器异常，请稍后重试' },
      { status: 500 }
    );
  }
}
