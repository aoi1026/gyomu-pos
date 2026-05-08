'use client';

import { useEffect, useState } from 'react';

export type KeyboardState = {
  /** ソフトウェアキーボードが表示中かどうか（iPad Safari等の visualViewport 連動） */
  isOpen: boolean;
  /** キーボードの推定高さ (px) */
  keyboardHeight: number;
  /** 表示領域の上端オフセット (px) */
  visibleOffsetTop: number;
  /** 表示領域の高さ (px) */
  visibleHeight: number;
};

const DEFAULT_STATE: KeyboardState = {
  isOpen: false,
  keyboardHeight: 0,
  visibleOffsetTop: 0,
  visibleHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
};

/**
 * iPad/iOS のソフトウェアキーボード表示を visualViewport API で検知して
 * モーダル等のレイアウトを補正するための情報を返す。
 *
 * - `isOpen` … キーボード高さがしきい値（120px）を超えたら true
 * - `visibleHeight` … キーボードに隠れていない表示領域の高さ
 * - `visibleOffsetTop` … 表示領域の上端 (iOS のページ scroll 込み)
 */
export function useKeyboardAware(): KeyboardState {
  const [state, setState] = useState<KeyboardState>(DEFAULT_STATE);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;

    const update = () => {
      if (vv) {
        const fullH = window.innerHeight;
        const visibleH = vv.height;
        const offsetTop = vv.offsetTop;
        const kbH = Math.max(0, fullH - visibleH - offsetTop);
        setState({
          isOpen: kbH > 120,
          keyboardHeight: kbH,
          visibleOffsetTop: offsetTop,
          visibleHeight: visibleH,
        });
      } else {
        setState({
          isOpen: false,
          keyboardHeight: 0,
          visibleOffsetTop: 0,
          visibleHeight: window.innerHeight,
        });
      }
    };

    update();

    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return state;
}
