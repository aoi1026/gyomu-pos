import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const EPOS_PRINT_PATH = '/cgi-bin/epos/service.cgi';

async function getPrinterIp(): Promise<string | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT value FROM project_variable WHERE name = 'printer_ip'`
    );
    return result.rows[0]?.value || null;
  } finally {
    client.release();
  }
}

async function forwardEposPrint(
  ip: string,
  devid: string,
  timeout: number,
  soapBody: string
): Promise<{ status: number; body: string }> {
  const url = `http://${ip}${EPOS_PRINT_PATH}?devid=${encodeURIComponent(devid)}&timeout=${timeout}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""',
      },
      body: soapBody,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await res.text();
    return { status: res.status, body };
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') {
      throw new Error('プリンターへの接続がタイムアウトしました（60秒）');
    }
    throw new Error(`プリンター通信エラー: ${e?.message || '不明なエラー'}`);
  }
}

/** POST /api/print/epos — proxy ePOS-Print XML request to printer */
export async function POST(request: NextRequest) {
  try {
    const { ip, devid, timeout: reqTimeout, soap } = await request.json();

    if (!soap) {
      return NextResponse.json(
        { success: false, error: 'SOAP body が指定されていません' },
        { status: 400 }
      );
    }

    const printerIp = ip || (await getPrinterIp());
    if (!printerIp) {
      return NextResponse.json(
        { success: false, error: 'プリンターIPが設定されていません' },
        { status: 400 }
      );
    }

    const deviceId = devid || 'local_printer';
    const t = reqTimeout || 60000;

    const result = await forwardEposPrint(printerIp, deviceId, t, soap);

    return new NextResponse(result.body, {
      status: result.status,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'ePOS-Print proxy error' },
      { status: 500 }
    );
  }
}

/** GET /api/print/epos — connection test via ePOS-Print XML */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');

    const printerIp = ip || (await getPrinterIp());
    if (!printerIp) {
      return NextResponse.json(
        { success: false, error: 'プリンターIPが設定されていません' },
        { status: 400 }
      );
    }

    const testSoap = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
<s:Body>
<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
</epos-print>
</s:Body>
</s:Envelope>`;

    const result = await forwardEposPrint(printerIp, 'local_printer', 10000, testSoap);

    if (result.status >= 200 && result.status < 300) {
      return NextResponse.json({
        success: true,
        message: `正常に接続されました (${printerIp})`,
        response: result.body.substring(0, 500),
      });
    }

    return NextResponse.json({
      success: false,
      error: `プリンターからエラー応答 (HTTP ${result.status})`,
      response: result.body.substring(0, 500),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || '接続テストに失敗しました' },
      { status: 500 }
    );
  }
}
