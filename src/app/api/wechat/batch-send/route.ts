import { NextRequest, NextResponse } from 'next/server';

/**
 * 批量推送文章到公众号
 * 上传图文素材并群发
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken, articles, target } = await request.json();

    if (!accessToken || !articles || articles.length === 0) {
      return NextResponse.json(
        { error: '参数不完整：accessToken和articles不能为空' },
        { status: 400 }
      );
    }

    // 验证articles格式
    const validArticles = articles.filter((article: {
      title: string;
      author: string;
      digest: string;
      content: string;
      content_source_url: string;
      thumb_media_id?: string;
      show_cover_pic?: number;
      need_open_comment?: number;
      only_fans_can_comment?: number;
    }) =>
      article.title && article.author && article.digest && article.content && article.content_source_url
    );

    if (validArticles.length === 0) {
      return NextResponse.json(
        { error: '至少需要一篇有效的文章（包含title、author、digest、content、content_source_url）' },
        { status: 400 }
      );
    }

    // 步骤1：上传图文素材
    const materialUrl = `https://api.weixin.qq.com/cgi-bin/material/add_news?access_token=${accessToken}`;

    const materialBody = {
      articles: validArticles.map((article: {
        title: string;
        author: string;
        digest: string;
        content: string;
        content_source_url: string;
        thumb_media_id?: string;
        show_cover_pic?: number;
        need_open_comment?: number;
        only_fans_can_comment?: number;
      }) => ({
        title: article.title,
        author: article.author,
        digest: article.digest,
        content: article.content,
        content_source_url: article.content_source_url,
        thumb_media_id: article.thumb_media_id || '', // 缩略图素材ID，需要先上传
        show_cover_pic: article.show_cover_pic ?? 1,
        need_open_comment: article.need_open_comment ?? 1,
        only_fans_can_comment: article.only_fans_can_comment ?? 0
      }))
    };

    const materialResponse = await fetch(materialUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(materialBody),
    });

    const materialData = await materialResponse.json();

    if (materialData.errcode) {
      return NextResponse.json(
        { error: `上传图文素材失败: ${materialData.errmsg}` },
        { status: 400 }
      );
    }

    const mediaId = materialData.media_id;

    // 步骤2：群发消息
    const sendUrl = `https://api.weixin.qq.com/cgi-bin/message/mass/sendall?access_token=${accessToken}`;

    const sendBody = {
      filter: {
        is_to_all: target?.isToAll ?? true, // 是否群发给所有人
        tag_id: target?.tag_id // 如果要发给特定标签用户，提供tag_id
      },
      mpnews: {
        media_id: mediaId
      },
      msgtype: 'mpnews',
      send_ignore_reprint: 0 // 是否忽略转载
    };

    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendBody),
    });

    const sendData = await sendResponse.json();

    if (sendData.errcode) {
      return NextResponse.json(
        { error: `群发消息失败: ${sendData.errmsg}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        msgId: sendData.msg_id,
        msgDataId: sendData.msg_data_id,
        articles: validArticles
      }
    });

  } catch (error) {
    console.error('批量推送文章失败:', error);
    return NextResponse.json(
      { error: '推送失败，请重试' },
      { status: 500 }
    );
  }
}

/**
 * 获取群发消息状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accessToken = searchParams.get('accessToken');
    const msgId = searchParams.get('msgId');

    if (!accessToken || !msgId) {
      return NextResponse.json(
        { error: 'accessToken和msgId不能为空' },
        { status: 400 }
      );
    }

    // 获取群发消息状态
    const url = `https://api.weixin.qq.com/cgi-bin/message/mass/get?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ msg_id: msgId }),
    });

    const data = await response.json();

    if (data.errcode) {
      return NextResponse.json(
        { error: `获取消息状态失败: ${data.errmsg}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('获取群发消息状态失败:', error);
    return NextResponse.json(
      { error: '获取消息状态失败，请重试' },
      { status: 500 }
    );
  }
}
