import { useEffect, useState } from 'react';

// Products are only worth center-zooming when they carry the newer large,
// white-padded photo sets. Anything with fewer images keeps its original
// (uncropped) framing.
export const ZOOM_MIN_IMAGES = 20;

// A pixel counts as "background" when it is near-white (or fully transparent).
// Product photos are shot on pure white, so anything darker than this is the
// product itself.
const WHITE_THRESHOLD = 245;

// The center-zoom enlarges the image ~1.5x and crops from the center, which
// removes roughly 1/6 (~16.7%) off each edge. We require at least this much
// uniform white margin on every side before allowing the zoom, otherwise the
// crop would slice into the product.
const SAFE_MARGIN = 0.14;

// Downscale before sampling so the analysis stays cheap regardless of the
// original resolution.
const SAMPLE_MAX = 160;

export const shouldConsiderZoom = (imageCount) =>
  (imageCount || 0) >= ZOOM_MIN_IMAGES;

// src -> Promise<{ safe: boolean, margins: object | null }>
const analysisCache = new Map();

const analyzeWhitespace = (src) => {
  if (!src || typeof document === 'undefined') {
    return Promise.resolve({ safe: false, margins: null });
  }
  if (analysisCache.has(src)) {
    return analysisCache.get(src);
  }

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const ratio = Math.min(1, SAMPLE_MAX / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        // Bounding box of the non-white (product) pixels.
        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const i = (y * w + x) * 4;
            const alpha = data[i + 3];
            const isBackground =
              alpha < 16 ||
              (data[i] >= WHITE_THRESHOLD &&
                data[i + 1] >= WHITE_THRESHOLD &&
                data[i + 2] >= WHITE_THRESHOLD);
            if (!isBackground) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < 0) {
          // Entirely white — nothing to protect, but nothing to show either.
          resolve({ safe: false, margins: null });
          return;
        }

        const margins = {
          left: minX / w,
          right: (w - 1 - maxX) / w,
          top: minY / h,
          bottom: (h - 1 - maxY) / h,
        };
        const minMargin = Math.min(
          margins.left,
          margins.right,
          margins.top,
          margins.bottom
        );

        resolve({ safe: minMargin >= SAFE_MARGIN, margins });
      } catch (error) {
        // Tainted canvas (cross-origin without CORS) or any read failure:
        // err on the side of not cropping.
        resolve({ safe: false, margins: null });
      }
    };

    img.onerror = () => resolve({ safe: false, margins: null });
    img.src = src;
  });

  analysisCache.set(src, promise);
  return promise;
};

/**
 * Decide whether a product image can be safely center-zoomed.
 *
 * Returns true only when zooming is enabled (enough images) AND the image has
 * enough white padding on every side that the crop won't cut off the product.
 */
export const useSafeZoom = (src, enabled = true) => {
  const [safe, setSafe] = useState(false);

  useEffect(() => {
    if (!enabled || !src) {
      setSafe(false);
      return undefined;
    }

    let active = true;
    analyzeWhitespace(src).then((result) => {
      if (active) setSafe(result.safe);
    });
    return () => {
      active = false;
    };
  }, [src, enabled]);

  return safe;
};
