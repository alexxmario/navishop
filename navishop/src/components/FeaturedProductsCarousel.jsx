import { useState, useEffect, useRef } from 'react';
import Marquee from './Marquee';
import ProductCard from './ProductCard';
import apiService from '../services/api';

const FeaturedProductsCarousel = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        setLoading(true);
        const products = await apiService.getFeaturedProducts();
        setFeaturedProducts(products || []);
      } catch (error) {
        console.error('Failed to load featured products:', error);
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedProducts();
  }, []);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Next slide, loop to first if at end
      setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
    }
    if (isRightSwipe) {
      // Previous slide, loop to last if at beginning
      setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
    }
  };

  if (loading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-center mb-16 font-bold text-4xl md:text-5xl text-black">
            PRODUSE RECOMANDATE
          </h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (!featuredProducts.length) {
    return null;
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-center mb-16 font-bold text-4xl md:text-5xl text-black">
          PRODUSE RECOMANDATE
        </h2>
        <h6 className="text-center mb-12 text-gray-600 text-xl font-light">
          Cele mai populare navigații auto
        </h6>

        {isMobile ? (
          // Mobile/Tablet Simple Swipeable Carousel
          <div className="relative">
            <div
              ref={carouselRef}
              className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                touchAction: 'pan-x'
              }}
            >
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                {featuredProducts.map((product) => (
                  <div
                    key={product._id}
                    className="w-full flex-shrink-0 px-4"
                    style={{
                      minWidth: '100%',
                      width: '100%'
                    }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center mt-6 space-x-2">
              {featuredProducts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          // Desktop Marquee
          <Marquee
            direction="left"
            className="py-4"
            speed={60}
            pauseOnHover={true}
          >
            {featuredProducts.map((product) => (
              <div key={product._id} className="mx-4">
                <ProductCard product={product} className="w-80" />
              </div>
            ))}
          </Marquee>
        )}
      </div>
    </section>
  );
};

export default FeaturedProductsCarousel;