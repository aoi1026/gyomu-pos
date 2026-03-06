'use client';

type CompressOptions = {
  /**
   * Maximum width/height in pixels (long side).
   * Images larger than this will be downscaled.
   */
  maxDimension?: number;
  /**
   * Output format preference. If the input has alpha channel, PNG is used.
   * Falls back to image/jpeg when WebP canvas encoding is not supported (e.g. iOS < 14).
   */
  preferFormat?: 'image/webp' | 'image/jpeg';
  /**
   * Quality for lossy formats (0..1). Used for webp/jpeg.
   */
  quality?: number;
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = dataUrl;
  });
}

/**
 * Returns false (not true) on any error so that JPEG is preferred over PNG
 * when alpha channel detection fails (e.g. iOS memory pressure / security restrictions).
 */
function hasAlphaChannel(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 255) return true;
    }
  } catch {
    // Cannot inspect pixels — assume no alpha to avoid forcing large PNG output
    return false;
  }
  return false;
}

/**
 * Returns true only if the browser's canvas can actually encode WebP.
 * iOS Safari < 14 silently falls back to PNG, so we detect this explicitly.
 */
function canvasSupportsWebP(): boolean {
  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    return probe.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

function renderToCanvas(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
  }
  return canvas;
}

/**
 * Compress an image file into a Data URL suitable for storing in DB.
 * - Downscales large images (default max 1280px on long side).
 * - Uses WebP for non-alpha images only when the browser supports canvas WebP encoding.
 *   Falls back to JPEG (never falls back to PNG for non-alpha images).
 * - Uses PNG only for images that genuinely have an alpha channel.
 * - On any canvas encoding failure, retries with JPEG before falling back to the
 *   original data URL (avoiding silent return of multi-MB uncompressed blobs).
 */
export async function compressImageFileToDataUrl(
  file: File,
  opts?: CompressOptions
): Promise<string> {
  const maxDimension = Math.max(64, Math.min(opts?.maxDimension ?? 1280, 4096));
  const preferFormat = opts?.preferFormat ?? 'image/webp';
  const quality = Math.max(0.1, Math.min(opts?.quality ?? 0.8, 1));

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return dataUrl;

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  const canvas = renderToCanvas(img, dstW, dstH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Determine output format
  const alpha = ctx ? hasAlphaChannel(ctx, dstW, dstH) : false;

  let mime: string;
  if (alpha) {
    mime = 'image/png';
  } else if (preferFormat === 'image/webp' && canvasSupportsWebP()) {
    mime = 'image/webp';
  } else {
    // iOS < 14 does not support WebP canvas encoding; always use JPEG as safe fallback
    mime = 'image/jpeg';
  }

  // Primary encode attempt
  try {
    return mime === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL(mime, quality);
  } catch {
    // Secondary attempt: JPEG is universally supported for lossy encoding
    try {
      return canvas.toDataURL('image/jpeg', quality);
    } catch {
      // Last resort: return original data URL
      // (only reached if the browser cannot encode canvas at all)
      return dataUrl;
    }
  }
}
