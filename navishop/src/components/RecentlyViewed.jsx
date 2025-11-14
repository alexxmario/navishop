import React from 'react';
import { Link } from 'react-router-dom';
import { useRecentlyViewed } from '../RecentlyViewedContext';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const FALLBACK_IMAGE = 'https://via.placeholder.com/160x120?text=Navishop';

const RecentlyViewed = () => {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();

  if (recentlyViewed.length === 0) {
    return null;
  }

  const scrollContainer = (direction) => {
    const container = document.getElementById('recently-viewed-container');
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200 py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Vizualizate recent</h3>
          <button
            onClick={clearRecentlyViewed}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
          >
            <X className="w-3 h-3 mr-1" />
            Șterge istoric
          </button>
        </div>
        
        <div className="relative">
          <div className="flex items-center">
            <button
              onClick={() => scrollContainer('left')}
              className="hidden md:flex absolute left-0 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:shadow-md transition-shadow"
              style={{ marginLeft: '-16px' }}
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            
            <div
              id="recently-viewed-container"
              className="flex space-x-3 overflow-x-auto scrollbar-hide pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {recentlyViewed.map((product) => (
                <Link
                  key={product._id}
                  to={`/product/${product.slug}`}
                  className="flex-shrink-0 group"
                >
                  <div className="w-24 h-20 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = FALLBACK_IMAGE;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <div className="w-8 h-8 bg-blue-100 rounded border border-blue-200"></div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate w-24 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </p>
                  <p className="text-xs font-medium text-gray-900">
                    {product.price} lei
                  </p>
                </Link>
              ))}
            </div>
            
            <button
              onClick={() => scrollContainer('right')}
              className="hidden md:flex absolute right-0 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:shadow-md transition-shadow"
              style={{ marginRight: '-16px' }}
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentlyViewed;
