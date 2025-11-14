import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart, ShoppingCart } from 'lucide-react';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';

const ProductCard = ({ product, viewMode = 'grid', className = '' }) => {
  const { addToCart } = useCart();
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
      const response = await fetch(`http://localhost:5001/api/reviews/stats/${product._id}`);
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
      alert('Product added to cart successfully!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert(`Failed to add to cart: ${error.message}`);
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

  if (viewMode === 'list') {
    return (
      <div className={`bg-white border border-gray-100 p-6 hover:shadow-lg transition-shadow ${className}`}>
        <Link to={`/product/${product.slug}`} className="flex gap-6">
          {/* Image */}
          <div className="flex-shrink-0 w-48 h-48">
            <img
              src={product.images?.[0]?.url || '/placeholder-image.jpg'}
              alt={product.images?.[0]?.alt || product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 line-clamp-2">
              {product.name}
            </h3>

            {renderRating()}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">
                  {product.price} lei
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
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
            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
              {product.shortDescription || product.description?.substring(0, 150) + '...'}
            </p>

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
    );
  }

  return (
    <div className={`bg-white border border-gray-100 group hover:shadow-lg transition-shadow ${className}`}>
      <Link to={`/product/${product.slug}`} className="block p-6">
        {/* Image */}
        <div className="mb-4">
          <img
            src={product.images?.[0]?.url || '/placeholder-image.jpg'}
            alt={product.images?.[0]?.alt || product.name}
            className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-3 text-gray-900 line-clamp-2">
          {product.name}
        </h3>

        {/* Rating */}
        {renderRating()}

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              {product.price} lei
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
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

        {/* Discount Badge */}
        {product.discount > 0 && (
          <div className="absolute top-2 left-2">
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              -{product.discount}%
            </span>
          </div>
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
      </Link>
    </div>
  );
};

export default ProductCard;