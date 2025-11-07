import React, { useState, useRef, useEffect } from 'react';

const ImageSlider360 = ({ images = [], productName = 'Product' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartIndex, setDragStartIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCarouselMode, setIsCarouselMode] = useState(false);

  // Generate carousel images (screens ON)
  const generateCarouselImages = () => {
    const carouselImages = [];
    for (let i = 1; i <= 10; i++) {
      carouselImages.push({
        url: `http://localhost:5001/test-slider-on/Navigatie_WV_portina_${i}.jpg`,
        alt: `Screen ON View ${i}`,
        isPrimary: i === 1
      });
    }
    return carouselImages;
  };

  const carouselImages = generateCarouselImages();
  const currentImages = isCarouselMode ? carouselImages : images;
  
  const containerRef = useRef(null);
  const autoRotateRef = useRef(null);

  // Auto rotation effect
  useEffect(() => {
    if (isAutoRotating && !isDragging) {
      autoRotateRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % currentImages.length);
      }, 150); // Adjust speed here
    } else {
      clearInterval(autoRotateRef.current);
    }
    
    return () => clearInterval(autoRotateRef.current);
  }, [isAutoRotating, isDragging, currentImages.length]);

  // Reset index when switching modes
  useEffect(() => {
    setCurrentIndex(0);
  }, [isCarouselMode]);

  // Handle mouse/touch drag
  const handleMouseDown = (e) => {
    if (currentImages.length <= 1) return;
    
    setIsDragging(true);
    setDragStartX(e.clientX || e.touches?.[0]?.clientX);
    setDragStartIndex(currentIndex);
    setIsAutoRotating(false);
    
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || currentImages.length <= 1) return;
    
    const currentX = e.clientX || e.touches?.[0]?.clientX;
    const deltaX = currentX - dragStartX;
    const sensitivity = 3; // Adjust sensitivity
    const deltaIndex = Math.floor(deltaX / sensitivity);
    
    let newIndex = dragStartIndex - deltaIndex;
    if (newIndex < 0) newIndex = currentImages.length + (newIndex % currentImages.length);
    if (newIndex >= currentImages.length) newIndex = newIndex % currentImages.length;
    
    setCurrentIndex(newIndex);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, dragStartX, dragStartIndex]);

  const handleSliderChange = (newValue) => {
    setCurrentIndex(newValue);
    setIsAutoRotating(false);
  };


  if (!currentImages || currentImages.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm">
        <div className="text-center text-gray-600">
          No images available
        </div>
      </div>
    );
  }

  const currentImage = currentImages[currentIndex];
  const imageUrl = currentImage?.url?.startsWith('http') 
    ? currentImage.url 
    : `http://localhost:5001${currentImage?.url}`;

  return (
    <div className="relative">
      {/* Main Image Container */}
      <div 
        ref={containerRef}
        className={`
          border border-gray-100 rounded-lg overflow-hidden relative select-none shadow-sm
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
          ${isFullscreen ? 'fixed top-0 left-0 right-0 bottom-0 z-50 bg-black flex items-center justify-center rounded-none' : 'bg-white'}
        `}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div
          className={`
            relative flex items-center justify-center
            ${isFullscreen ? 'w-screen h-screen' : 'w-full h-96'}
          `}
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
        </div>
      </div>

      {/* Controls */}
      {isCarouselMode ? (
        /* Carousel Mode - Show thumbnails and 360° button in same layout */
        <div className="mt-4">
          <div className="flex items-center gap-4">
            {currentImages.length > 1 && (
              <div className="flex-1 flex justify-center gap-2">
                {currentImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-12 h-12 rounded border-2 overflow-hidden transition hover:scale-105 ${
                      currentIndex === index
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img 
                      src={img.url} 
                      alt={img.alt}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setIsCarouselMode(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              🔄 360°
            </button>
          </div>
        </div>
      ) : (
        /* 360° Mode - Show slider and Pornește button */
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={currentImages.length - 1}
              step={1}
              value={currentIndex}
              onChange={(e) => handleSliderChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentIndex / (currentImages.length - 1)) * 100}%, #e5e7eb ${(currentIndex / (currentImages.length - 1)) * 100}%, #e5e7eb 100%)`
              }}
            />
            <button
              onClick={() => setIsCarouselMode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              ⚡ Pornește
            </button>
          </div>
        </div>
      )}

      {/* Custom slider styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          border: 2px solid white;
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          border: 2px solid white;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ImageSlider360;