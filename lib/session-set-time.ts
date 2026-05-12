/**
 * セット延長まわりの開始/終了時刻（店舗の N 分単位グリッド）用ユーティリティ。
 * +/− 初回は現在時刻をグリッドに合わえてから、以降は N 分加減。
 */

export type SessionTimeStepMin = 5 | 10 | 15;

export function normalizeSessionTimeStep(n: number): SessionTimeStepMin {
  if (n === 10 || n === 15) return n;
  return 5;
}

/** その日のローカル 0:00 の Date */
function localMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** その日の 0 時からの「時×60+分」（ローカル）。秒は含めない。 */
export function localMinutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * +1: グリッド未整列なら次の上側へ、整列なら +step 分
 * -1: グリッド未整列なら下側へ、整列なら -step 分
 * 秒・ミリ秒は維持（同一インスタントのずれを避ける）。
 */
export function shiftLocalStartByStep(createdAt: Date, step: number, direction: 1 | -1): Date {
  const s = Math.max(1, step);
  const src = new Date(createdAt);
  const sec = src.getSeconds();
  const ms = src.getMilliseconds();
  const mod = localMinutesOfDay(src) % s;

  const out = new Date(src);
  if (direction === 1) {
    if (mod !== 0) {
      out.setMinutes(out.getMinutes() + (s - mod));
    } else {
      out.setMinutes(out.getMinutes() + s);
    }
  } else {
    if (mod !== 0) {
      out.setMinutes(out.getMinutes() - mod);
    } else {
      out.setMinutes(out.getMinutes() - s);
    }
  }
  out.setSeconds(sec, ms);
  return out;
}

/** "HH:mm" / "H:mm" をパース */
export function parseHHMM(input: string): { h: number; m: number } | null {
  const t = input.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/**
 * anchor のローカル日付の 0:00 を基準に、入力（ローカル h:m）を通算分へ変換し
 * step に最近傍スナップした時刻へする。日またぎは setMinutes で自然に
 * 繰り上がる。
 */
export function setLocalTimeFromHHMMSnapped(anchor: Date, h: number, m: number, step: number): Date {
  const s = Math.max(1, step);
  const rawTotal = h * 60 + m;
  const snappedTotal = Math.round(rawTotal / s) * s;
  const base = localMidnight(anchor);
  const out = new Date(base);
  const sec = anchor.getSeconds();
  const ms = anchor.getMilliseconds();
  out.setMinutes(snappedTotal);
  out.setSeconds(sec, ms);
  return out;
}
