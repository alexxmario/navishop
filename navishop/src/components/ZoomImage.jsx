import React from 'react';
import { shouldConsiderZoom, useSafeZoom } from '../utils/imageZoom';

/**
 * Product <img> that center-zooms only when it is safe to do so.
 *
 * Zoom is applied when the product has enough images (>= ZOOM_MIN_IMAGES) AND
 * the photo has enough white margin that the crop won't cut off the product.
 * Otherwise the image falls back to its uncropped framing.
 *
 * - `className`   base classes always applied
 * - `zoomClass`   classes applied when the zoom is safe
 * - `noZoomClass` classes applied when zoom is disabled or unsafe
 */
const ZoomImage = ({
  src,
  alt = '',
  imageCount = 0,
  className = '',
  zoomClass = '',
  noZoomClass = '',
  ...rest
}) => {
  const zoom = useSafeZoom(src, shouldConsiderZoom(imageCount));
  const classes = `${className} ${zoom ? zoomClass : noZoomClass}`.trim();

  return <img src={src} alt={alt} className={classes} {...rest} />;
};

export default ZoomImage;
