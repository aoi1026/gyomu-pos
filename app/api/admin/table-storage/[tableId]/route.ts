import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const tableId = parseInt(params.tableId);
    
    if (isNaN(tableId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid table ID' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // テーブル情報を取得
      const tableResult = await client.query(
        'SELECT * FROM "table" WHERE id = $1',
        [tableId]
      );

      if (tableResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Table not found' },
          { status: 404 }
        );
      }

      const table = tableResult.rows[0];

      // アクティブなセッションを取得
      const sessionResult = await client.query(
        'SELECT * FROM sessions WHERE table_id = $1 AND status = 1 ORDER BY created_at DESC LIMIT 1',
        [tableId]
      );

      const session = sessionResult.rows.length > 0 ? sessionResult.rows[0] : null;

      // セッションに関連するデータを取得
      let localStorageData: Record<string, any> = {
        table_auth: {
          table_id: table.id.toString(),
          table_label: table.name,
          area: table.area || '',
          capacity: table.capacity || 0,
          status: table.status || 'available'
        }
      };

      if (session) {
        // セッション情報をローカルストレージ形式で保存
        localStorageData.current_session_id = session.id.toString();
        localStorageData.guest_count = session.client?.toString() || '';
        localStorageData.set_count = session.set_count?.toString() || '1';

        // カート注文を取得
        const cartOrdersResult = await client.query(
          `SELECT so.*, p.name as product_name, p.sale_price, p.category_id,
                  c.name as cast_name, c.mail as cast_mail
           FROM salesorder so
           LEFT JOIN product p ON so.product_id = p.id
           LEFT JOIN "user" c ON so.cast_id = c.id
           WHERE so.session_id = $1 AND so.status != 'completed'
           ORDER BY so.created_at DESC`,
          [session.id]
        );

        // サービス注文を取得
        const serviceOrdersResult = await client.query(
          `SELECT so.*, s.name as service_name,
                  c.name as cast_name, c.mail as cast_mail
           FROM serviceorder so
           LEFT JOIN services s ON so.service_id = s.id
           LEFT JOIN "user" c ON so.cast_id = c.id
           WHERE so.session_id = $1
           ORDER BY so.created_at DESC`,
          [session.id]
        );

        // 指名情報を取得
        const nominationsResult = await client.query(
          `SELECT n.*, c.name as cast_name, c.mail as cast_mail
           FROM nomination n
           LEFT JOIN "user" c ON n.cast_id = c.id
           WHERE n.session_id = $1
           ORDER BY n.created_at DESC`,
          [session.id]
        );

        // セット延長情報を取得（sessionsテーブルから）
        const setExtensionStartTime = session.created_at 
          ? new Date(session.created_at).getTime().toString()
          : Date.now().toString();
        
        // セット延長の合計秒数を計算（set_count * 3600秒）
        const totalSeconds = (session.set_count || 1) * 3600;

        localStorageData.set_extension_start_time = setExtensionStartTime;
        localStorageData.set_extension_total_seconds = totalSeconds.toString();
        localStorageData.set_extensions = JSON.stringify([]); // 延長履歴は空配列

        // カート注文をローカルストレージ形式に変換
        const cartOrders = cartOrdersResult.rows.map(order => ({
          id: order.id,
          product_id: order.product_id,
          product_name: order.product_name,
          quantity: order.amount, // salesorderテーブルではamountが数量
          price: order.unit_price, // salesorderテーブルではunit_priceが単価
          total_price: order.total_price,
          cast_id: order.cast_id,
          cast_name: order.cast_name,
          cast_mail: order.cast_mail,
          is_for_cast: order.for_cast === 1, // salesorderテーブルではfor_castは0または1
          status: order.status,
          created_at: order.created_at
        }));

        localStorageData[`cart_orders_${session.id}`] = JSON.stringify(cartOrders);

        // サービス注文をローカルストレージ形式に変換
        const serviceOrders = serviceOrdersResult.rows.map(order => ({
          id: order.id,
          service_id: order.service_id,
          service_name: order.service_name,
          amount: order.amount,
          cast_id: order.cast_id,
          cast_name: order.cast_name,
          cast_mail: order.cast_mail,
          status: order.status,
          created_at: order.created_at
        }));

        localStorageData[`service_orders_${session.id}`] = JSON.stringify(serviceOrders);

        // 指名料金を計算（nominationテーブルから）
        const nominationCharges = nominationsResult.rows.map(nom => ({
          id: nom.id,
          cast_id: nom.cast_id,
          cast_name: nom.cast_name,
          type: nom.type_id || 'main',
          cost: parseFloat(nom.cost || 0),
          created_at: nom.created_at
        }));

        localStorageData.nomination_charges = JSON.stringify(nominationCharges);
      }

      return NextResponse.json({
        success: true,
        data: {
          table,
          session,
          localStorageData
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('テーブルストレージデータ取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch table storage data' },
      { status: 500 }
    );
  }
}

