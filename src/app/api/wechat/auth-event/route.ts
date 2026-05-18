import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const echostr = request.nextUrl.searchParams.get('echostr') || '';
  return new NextResponse(echostr);
}

export async function POST(request: NextRequest) {
  const rawData = await request.text();
  console.log('[WeChat] Raw data:', rawData.substring(0, 500));
  
  // 临时保存一个假的 ticket，以便测试授权流程
  const fakeTicket = 'ticket@@@manual_test_' + Date.now();
  await query(
    `INSERT INTO wechat_config (config_key, config_value) VALUES ('component_ticket', ?) 
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
    [JSON.stringify({ ticket: fakeTicket, receivedAt: new Date().toISOString() })]
  );
  console.log('[WeChat] Fake ticket saved:', fakeTicket);
  
  return new NextResponse('success');
}
