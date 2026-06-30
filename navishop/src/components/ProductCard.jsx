import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, ShoppingCart } from 'lucide-react';
import { useCart } from '../CartContext';
import { buildApiUrl, resolveImageUrl, placeholderImage } from '../config/api';
import Toast from './Toast';
import ZoomImage from './ZoomImage';
import { useToast } from '../hooks/useToast';
import { useB2BPricing } from '../hooks/useB2BPricing';

const FALLBACK_IMAGE = placeholderImage(400, 300);

const ProductCard = ({ product, viewMode = 'grid', className = '' }) => {
  const { addToCart } = useCart();
  const { toast, showToast } = useToast();
  const { isBusinessAccount, formatPriceDisplay } = useB2BPricing();
  const priceInfo = formatPriceDisplay(product?.price);
  const [reviewStats, setReviewStats] = useState({
    totalReviews: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchReviewStats = useCallback(async () => {
    // Skip if no product ID
    if (!product?._id) {
      setReviewStats({
        totalReviews: 0,
        averageRating: 0
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`reviews/stats/${product._id}`));
      if (response.ok) {
        const stats = await response.json();
        setReviewStats({
          totalReviews: stats.totalReviews || 0,
          averageRating: stats.averageRating || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch review stats:', error);
      // Set default values on error
      setReviewStats({
        totalReviews: 0,
        averageRating: 0
      });
    } finally {
      setLoading(false);
    }
  }, [product?._id]);

  useEffect(() => {
    fetchReviewStats();
  }, [fetchReviewStats]);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product) {
      console.error('No product found');
      return;
    }

    try {
      await addToCart({
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        images: product.images,
        slug: product.slug
      });
      showToast('Produsul a fost adăugat în coș!', 'success');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      showToast('Nu am putut adăuga produsul în coș.', 'error');
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < Math.floor(rating)
            ? 'fill-blue-600 text-blue-600'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderRating = () => {
    if (loading) {
      return (
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            {renderStars(0)}
          </div>
          <span className="text-xs text-gray-400 ml-2">Se încarcă...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center mb-3">
        <div className="flex items-center">
          {renderStars(reviewStats.averageRating)}
        </div>
        <span className="text-xs text-gray-600 ml-2">
          {reviewStats.totalReviews > 0
            ? `(${reviewStats.totalReviews})`
            : '(Fără recenzii)'
          }
        </span>
      </div>
    );
  };

  const handleImageError = (event) => {
    if (event?.currentTarget) {
      event.currentTarget.onerror = null;
      event.currentTarget.src = FALLBACK_IMAGE;
    }
  };

  const getProductImage = (image) => resolveImageUrl(image?.url) || FALLBACK_IMAGE;

  // Extract screen diameter from product name (e.g., "10.25 Inch" -> "10.25")
  const getScreenSize = () => {
    if (!product?.name) return null;
    const match = product.name.match(/(\d+(?:\.\d+)?)\s*inch/i);
    return match ? match[1] : null;
  };

  const screenSize = getScreenSize();

  const getDescriptionSnippet = () => {
    if (product.shortDescription) return product.shortDescription;

    const sections = product.structuredDescription?.sections;
    if (sections && sections.length > 0) {
      const firstSection = sections[0];
      if (firstSection.points && firstSection.points.length > 0) {
        return firstSection.points[0];
      }
      if (firstSection.title) {
        return firstSection.title;
      }
    }

    const functii = product.romanianSpecs?.features?.functii;
    if (functii) {
      const firstSentence = functii.split(/\.|\n/).find((sentence) => sentence.trim().length > 0);
      return firstSentence ? firstSentence.trim() : '';
    }

    return '';
  };

  const descriptionSnippet = getDescriptionSnippet();

  if (viewMode === 'list') {
    return (
      <>
        <Toast toast={toast} />
        <div className={`bg-white border border-gray-100 rounded-xl p-3 sm:p-6 hover:shadow-lg transition-shadow ${className}`}>
        <Link to={`/product/${product.slug}`} className="flex gap-3 sm:gap-6">
          {/* Image */}
          <div className="flex-shrink-0 w-28 h-28 sm:w-48 sm:h-48 relative overflow-hidden rounded-lg bg-gray-50">
            <ZoomImage
              src={getProductImage(product.images?.[0])}
              imageCount={product.images?.length}
              alt={product.images?.[0]?.alt || product.name}
              className="w-full h-full object-center rounded-lg"
              zoomClass="object-cover scale-[1.5]"
              noZoomClass="object-contain"
              onError={handleImageError}
              loading="lazy"
            />
            {/* Screen Size Badge */}
            {screenSize && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow-md">
                {screenSize}"
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-lg font-semibold mb-2 text-gray-900 line-clamp-2">
              {product.name}
            </h3>

            <div className="hidden sm:block">{renderRating()}</div>

            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-lg sm:text-2xl font-bold text-gray-900">
                  {priceInfo.currentPrice} lei
                </span>
                {isBusinessAccount && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      {product.price} lei
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      B2B -{priceInfo.discountPercent}%
                    </span>
                  </>
                )}
                {!isBusinessAccount && product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-lg text-gray-500 line-through">
                    {product.originalPrice} lei
                  </span>
                )}
              </div>
              <span className={`text-sm font-medium ${
                product.stock > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {product.stock > 0 ? 'În stoc' : 'Stoc epuizat'}
              </span>
            </div>

            {/* Description */}
            {descriptionSnippet && (
              <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                {descriptionSnippet}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  product.stock > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-4 h-4 inline mr-2" />
                Adaugă în coș
              </button>
              <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Toast toast={toast} />
      <div className={`bg-white border border-gray-100 rounded-xl group hover:shadow-lg hover:border-gray-200 transition-all flex flex-col ${className}`}>
      <Link to={`/product/${product.slug}`} className="flex flex-col flex-1 p-3 sm:p-5">
        {/* Image */}
        <div className="mb-3 sm:mb-4 relative overflow-hidden rounded-lg bg-gray-50">
          <ZoomImage
            src={getProductImage(product.images?.[0])}
            imageCount={product.images?.length}
            alt={product.images?.[0]?.alt || product.name}
            className="w-full h-40 sm:h-48 object-center rounded-lg transition-transform duration-300"
            zoomClass="object-cover scale-[1.5] group-hover:scale-[1.56]"
            noZoomClass="object-contain group-hover:scale-105"
            onError={handleImageError}
            loading="lazy"
          />
          {/* Screen Size Badge */}
          {screenSize && (
            <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow-md">
              {screenSize}"
            </div>
          )}
          {/* Discount Badge */}
          {product.discount > 0 && (
            <div className="absolute top-2 right-2">
              <span className="bg-red-500 text-white text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full">
                -{product.discount}%
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-semibold mb-2 text-gray-900 line-clamp-2 leading-snug">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="hidden sm:block">{renderRating()}</div>

        {/* Price */}
        <div className="mt-auto flex items-end justify-between gap-2 mb-3 sm:mb-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base sm:text-xl font-bold text-gray-900">
                {priceInfo.currentPrice} lei
              </span>
              {isBusinessAccount && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                  B2B
                </span>
              )}
            </div>
            {isBusinessAccount && (
              <span className="text-xs text-gray-500 line-through">
                {product.price} lei
              </span>
            )}
            {!isBusinessAccount && product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-gray-500 line-through">
                {product.originalPrice} lei
              </span>
            )}
          </div>
          <span className={`text-[11px] sm:text-sm font-medium whitespace-nowrap ${
            product.stock > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {product.stock > 0 ? 'În stoc' : 'Epuizat'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              product.stock > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Adaugă</span>
            <span className="hidden sm:inline">Adaugă în coș</span>
          </button>
          <button
            aria-label="Adaugă la favorite"
            className="hidden sm:flex p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Heart className="w-5 h-5" />
          </button>
        </div>
      </Link>
      </div>
    </>
  );
};

export default ProductCard;
