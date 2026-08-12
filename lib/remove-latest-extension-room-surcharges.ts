/**
 * セット延長時に追加された VIP / カラオケの追加料金（note が「セット延長」）について、
 * 種類ごとに最新の1件を DB から削除する（クライアントから fetch する想定）。
 */
export async function removeLatestExtensionRoomSurcharges(sessionId: number): Promise<void> {
  if (!Number.isFinite(sessionId) || sessionId <= 0) return;

  const res = await fetch(`/api/additional-services?session_id=${sessionId}`, {
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success || !Array.isArray(json.data)) return;

  type Row = { id?: number; type: string; note?: string; timestamp: number };
  const rows = json.data as Row[];

  const pickLatest = (type: 'vip_room' | 'karaoke') =>
    rows
      .filter((s) => s.type === type && s.note === 'セット延長')
      .sort((a, b) => b.timestamp - a.timestamp)[0];

  const ids = [pickLatest('vip_room')?.id, pickLatest('karaoke')?.id].filter(
    (id): id is number => typeof id === 'number' && id > 0
  );

  await Promise.all(
    ids.map((id) =>
      fetch(`/api/additional-services/${id}`, { method: 'DELETE' }).catch(() => undefined)
    )
  );
}
