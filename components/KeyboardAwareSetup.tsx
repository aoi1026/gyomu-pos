'use client';

import { useEffect } from 'react';

/**
 * iPad / iOS Safari の visualViewport 変動を CSS 変数として `:root` に公開する。
 *
 * - `--vv-height`        … 表示領域の高さ (px)
 * - `--vv-offset-top`    … 表示領域の上端オフセット (px)
 * - `--keyboard-height`  … 推定キーボード高さ (px)
 *
 * モーダルや独自フッター等から `calc(100vh - var(--keyboard-height, 0px))` で
 * 高さ調整したい場合に使える。
 *
 * フォーカスされた入力要素がキーボードに隠れている場合は scrollIntoView で
 * 表示領域に引き上げるフォールバックも提供する（モーダル外の入力欄向け）。
 */
export default function KeyboardAwareSetup() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    const update = () => {
      const fullH = window.innerHeight;
      const vv = window.visualViewport;
      const visibleH = vv ? vv.height : fullH;
      const offsetTop = vv ? vv.offsetTop : 0;
      const keyboardH = Math.max(0, fullH - visibleH - offsetTop);
      root.style.setProperty('--vv-height', `${Math.round(visibleH)}px`);
      root.style.setProperty('--vv-offset-top', `${Math.round(offsetTop)}px`);
      root.style.setProperty('--keyboard-height', `${Math.round(keyboardH)}px`);
      if (keyboardH > 120) {
        root.dataset.keyboardOpen = 'true';
      } else {
        delete root.dataset.keyboardOpen;
      }
    };

    update();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);

    // モーダル外の通常ページの入力欄でも、キーボードに隠れていれば
    // scrollIntoView でビューポート内に引き上げる。
    const isFormElement = (el: Element | null): el is HTMLElement =>
      !!el &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        (el as HTMLElement).isContentEditable);

    const isInsideRadixPortal = (el: Element | null): boolean => {
      let cur: Element | null = el;
      while (cur) {
        if (cur instanceof HTMLElement) {
          if (cur.dataset?.radixPopperContentWrapper) return true;
          if (cur.getAttribute('role') === 'dialog') return true;
        }
        cur = cur.parentElement;
      }
      return false;
    };

    const ensureFocusedVisible = () => {
      const active = document.activeElement;
      if (!isFormElement(active)) return;
      // モーダル内は Dialog/Sheet 側で処理するためスキップ
      if (isInsideRadixPortal(active)) return;

      const visibleH = window.visualViewport?.height ?? window.innerHeight;
      const offsetTop = window.visualViewport?.offsetTop ?? 0;
      const visibleBottom = offsetTop + visibleH;
      const padding = 24;

      const rect = active.getBoundingClientRect();
      if (rect.bottom > visibleBottom - padding || rect.top < offsetTop + padding) {
        try {
          active.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {
          active.scrollIntoView();
        }
      }
    };

    const onFocusIn = () => {
      // キーボードが出るまで少し待つ
      setTimeout(ensureFocusedVisible, 200);
      setTimeout(ensureFocusedVisible, 450);
    };

    document.addEventListener('focusin', onFocusIn);

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  return null;
}
