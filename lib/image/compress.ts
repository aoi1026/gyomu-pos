'use client';

type CompressOptions = {
  /**
   * Maximum width/height in pixels (long side).
   * Images larger than this will be downscaled.
   */
  maxDimension?: number;
  /**
   * Output format preference. If the input has alpha channel, PNG is used.
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

function hasAlphaChannel(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 255) return true;
    }
  } catch {
    // If we can't inspect, assume alpha might exist to be safe.
    return true;
  }
  return false;
}

/**
 * Compress an image file into a Data URL suitable for storing in DB.
 * - Downscales large images (default max 1280px on long side).
 * - Uses WebP/JPEG for non-alpha images (default webp@0.8).
 * - Uses PNG for images with alpha (keeps transparency; downscaling still applies).
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

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return dataUrl;

  // Draw (downscale)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, dstW, dstH);

  const alpha = hasAlphaChannel(ctx, dstW, dstH);

  // Pick output mime
  const mime = alpha ? 'image/png' : preferFormat;

  // Convert to DataURL
  try {
    if (mime === 'image/png') return canvas.toDataURL('image/png');
    return canvas.toDataURL(mime, quality);
  } catch {
    // Fallback to original if conversion fails
    return dataUrl;
  }
}

