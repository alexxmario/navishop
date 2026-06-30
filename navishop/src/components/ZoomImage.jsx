import React from 'react';
import { shouldConsiderZoom, useZoomScale } from '../utils/imageZoom';

/**
 * Product <img> that zooms in as far as the photo's white padding safely
 * allows, and never crops the product.
 *
 * It always uses object-contain (whole product visible) and applies a center
 * transform scale computed from the image's white margins: well-padded photos
 * zoom in to fill the frame, tightly-shot photos zoom little or not at all.
 * Zoom is only considered when the product has enough images (>= ZOOM_MIN_IMAGES).
 *
 * - `className` base classes always applied (sizing, rounding, etc.)
 * - `hover`     when true (default) the image nudges a little larger on hover
 */
const ZoomImage = ({
  src,
  alt = '',
  imageCount = 0,
  className = '',
  hover = true,
  style,
  ...rest
}) => {
  const scale = useZoomScale(src, shouldConsiderZoom(imageCount));
  const hoverScale = hover ? Number((scale * 1.04).toFixed(3)) : scale;

  return (
    <img
      src={src}
      alt={alt}
      style={{ '--zoom': scale, '--zoom-hover': hoverScale, ...style }}
      className={`${className} object-contain transition-transform duration-300 [transform:scale(var(--zoom))] ${
        hover ? 'group-hover:[transform:scale(var(--zoom-hover))]' : ''
      }`.trim()}
      {...rest}
    />
  );
};

export default ZoomImage;
