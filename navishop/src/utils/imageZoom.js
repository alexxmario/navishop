import { useEffect, useState } from 'react';

// Products are only worth zooming when they carry the newer large,
// white-padded photo sets. Anything with fewer images keeps its original
// (un-zoomed) framing.
export const ZOOM_MIN_IMAGES = 20;

// A pixel counts as "background" when it is near-white (or fully transparent).
// Product photos are shot on pure white, so anything darker than this is the
// product itself.
const WHITE_THRESHOLD = 245;

// Downscale before sampling so the analysis stays cheap regardless of the
// original resolution.
const SAMPLE_MAX = 160;

// Never zoom past this, no matter how much white padding there is.
const MAX_SCALE = 1.5;

// How much of the theoretical "just touches the object" zoom we actually use.
// < 1 means we always stop a little short of the object, never on it.
const ZOOM_BACKOFF = 0.85;

export const shouldConsiderZoom = (imageCount) =>
  (imageCount || 0) >= ZOOM_MIN_IMAGES;

// Turn the smallest white margin into a zoom factor. With object-contain, a
// center scale of S crops (1 - 1/S)/2 off each side, so the largest scale that
// just reaches the object is 1 / (1 - 2 * margin). We back off from that so the
// crop always stops short of the product.
const marginToScale = (minMargin) => {
  if (!minMargin || minMargin <= 0) return 1;
  const justTouches = 1 / (1 - 2 * minMargin);
  const scale = 1 + ZOOM_BACKOFF * (justTouches - 1);
  return Math.min(MAX_SCALE, Math.max(1, Number(scale.toFixed(3))));
};

// src -> Promise<number | null>  (smallest white margin as a fraction)
const marginCache = new Map();

const measureWhitespace = (src) => {
  if (!src || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  if (marginCache.has(src)) {
    return marginCache.get(src);
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
          // Entirely white — nothing to zoom into.
          resolve(null);
          return;
        }

        const minMargin = Math.min(
          minX / w,
          (w - 1 - maxX) / w,
          minY / h,
          (h - 1 - maxY) / h
        );
        resolve(minMargin);
      } catch (error) {
        // Tainted canvas (cross-origin without CORS) or any read failure:
        // err on the side of not zooming.
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = src;
  });

  marginCache.set(src, promise);
  return promise;
};

/**
 * Returns the largest scale a product image can be zoomed to without cropping
 * the product, backed off slightly so it always stops short of the object.
 *
 * Returns 1 (no zoom) when zooming is disabled (too few images) or the image
 * has no usable white margin / can't be analyzed.
 */
export const useZoomScale = (src, enabled = true) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled || !src) {
      setScale(1);
      return undefined;
    }

    let active = true;
    measureWhitespace(src).then((minMargin) => {
      if (active) setScale(marginToScale(minMargin));
    });
    return () => {
      active = false;
    };
  }, [src, enabled]);

  return scale;
};
