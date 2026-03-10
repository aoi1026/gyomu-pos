import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import net from 'net';

const PRINTER_PORT = 9100;
// ネットワークプリンターは応答まで時間がかかることがあるため、接続タイムアウトを 60 秒に延長
const CONNECT_TIMEOUT = 60_000;

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

function sendToPrinter(ip: string, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error('接続がタイムアウトしました（60秒）'));
      }
    }, CONNECT_TIMEOUT);

    socket.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        socket.destroy();
        reject(new Error(`プリンター接続エラー: ${err.message}`));
      }
    });

    socket.connect(PRINTER_PORT, ip, () => {
      socket.write(data, (err) => {
        clearTimeout(timeout);
        if (err) {
          if (!settled) {
            settled = true;
            socket.destroy();
            reject(new Error(`データ送信エラー: ${err.message}`));
          }
        } else {
          socket.end(() => {
            if (!settled) {
              settled = true;
              resolve();
            }
          });
        }
      });
    });
  });
}

function testConnection(ip: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error('接続がタイムアウトしました（60秒）'));
      }
    }, CONNECT_TIMEOUT);

    socket.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        socket.destroy();
        reject(new Error(`プリンター接続エラー: ${err.message}`));
      }
    });

    socket.connect(PRINTER_PORT, ip, () => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        socket.end();
        resolve();
      }
    });
  });
}

/** GET /api/print — connection test */
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

    await testConnection(printerIp);
    return NextResponse.json({ success: true, ip: printerIp });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || '接続テストに失敗しました' },
      { status: 500 }
    );
  }
}

/** POST /api/print — send ESC/POS data to printer */
export async function POST(request: NextRequest) {
  try {
    const { data, ip } = await request.json();

    if (!data) {
      return NextResponse.json(
        { success: false, error: '印刷データが指定されていません' },
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

    const buffer = Buffer.from(data, 'base64');
    await sendToPrinter(printerIp, buffer);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || '印刷に失敗しました' },
      { status: 500 }
    );
  }
}
