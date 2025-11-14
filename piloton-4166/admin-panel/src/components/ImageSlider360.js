import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Paper,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  RotateLeft,
  RotateRight,
  ThreeSixty,
  PlayArrow,
  Pause,
  Fullscreen,
} from '@mui/icons-material';

const ImageSlider360 = ({ images = [], productName = 'Product' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartIndex, setDragStartIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef(null);
  const autoRotateRef = useRef(null);

  // Auto rotation effect
  useEffect(() => {
    if (isAutoRotating && !isDragging) {
      autoRotateRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 150); // Adjust speed here
    } else {
      clearInterval(autoRotateRef.current);
    }
    
    return () => clearInterval(autoRotateRef.current);
  }, [isAutoRotating, isDragging, images.length]);

  // Handle mouse/touch drag
  const handleMouseDown = (e) => {
    if (images.length <= 1) return;
    
    setIsDragging(true);
    setDragStartX(e.clientX || e.touches?.[0]?.clientX);
    setDragStartIndex(currentIndex);
    setIsAutoRotating(false);
    
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || images.length <= 1) return;
    
    const currentX = e.clientX || e.touches?.[0]?.clientX;
    const deltaX = currentX - dragStartX;
    const sensitivity = 3; // Adjust sensitivity
    const deltaIndex = Math.floor(deltaX / sensitivity);
    
    let newIndex = dragStartIndex - deltaIndex;
    if (newIndex < 0) newIndex = images.length + (newIndex % images.length);
    if (newIndex >= images.length) newIndex = newIndex % images.length;
    
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

  const handleSliderChange = (_, newValue) => {
    setCurrentIndex(newValue);
    setIsAutoRotating(false);
  };

  const toggleAutoRotate = () => {
    setIsAutoRotating(!isAutoRotating);
  };

  const rotateLeft = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsAutoRotating(false);
  };

  const rotateRight = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsAutoRotating(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!images || images.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center">
            No 360° images available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const currentImage = images[currentIndex];
  const imageUrl = currentImage?.url?.startsWith('http') 
    ? currentImage.url 
    : `http://localhost:5001${currentImage?.url}`;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Main Image Container */}
      <Card 
        ref={containerRef}
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          ...(isFullscreen && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            borderRadius: 0,
            bgcolor: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <Box
          sx={{
            width: isFullscreen ? '100vw' : '100%',
            height: isFullscreen ? '100vh' : 400,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 360° Indicator */}
          <Paper
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              borderRadius: 2
            }}
          >
            <ThreeSixty sx={{ fontSize: 16 }} />
            <Typography variant="caption" fontWeight="bold">
              360° VIEW
            </Typography>
          </Paper>

          {/* Loading/Frame Indicator */}
          <Paper
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              px: 2,
              py: 1,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              borderRadius: 2
            }}
          >
            <Typography variant="caption">
              {currentIndex + 1} / {images.length}
            </Typography>
          </Paper>

          {/* Drag Instruction */}
          {!isDragging && !isAutoRotating && (
            <Paper
              sx={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                px: 2,
                py: 1,
                bgcolor: 'rgba(0,0,0,0.7)',
                color: 'white',
                borderRadius: 2,
                animation: 'pulse 2s infinite'
              }}
            >
              <Typography variant="caption">
                🖱️ Drag to rotate or use controls below
              </Typography>
            </Paper>
          )}

          {/* Fullscreen Toggle */}
          <IconButton
            onClick={toggleFullscreen}
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.8)'
              }
            }}
          >
            <Fullscreen />
          </IconButton>
        </Box>
      </Card>

      {/* Controls */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          {/* Rotation Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Tooltip title="Rotate Left">
              <IconButton onClick={rotateLeft} size="large">
                <RotateLeft />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={isAutoRotating ? "Pause Auto-Rotation" : "Start Auto-Rotation"}>
              <IconButton 
                onClick={toggleAutoRotate} 
                size="large"
                color={isAutoRotating ? "primary" : "default"}
              >
                {isAutoRotating ? <Pause /> : <PlayArrow />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Rotate Right">
              <IconButton onClick={rotateRight} size="large">
                <RotateRight />
              </IconButton>
            </Tooltip>

            <Box sx={{ flex: 1, mx: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Frame: {currentIndex + 1} of {images.length}
              </Typography>
              <Slider
                value={currentIndex}
                min={0}
                max={images.length - 1}
                step={1}
                onChange={handleSliderChange}
                sx={{
                  '& .MuiSlider-thumb': {
                    width: 20,
                    height: 20,
                  },
                  '& .MuiSlider-track': {
                    height: 6,
                  },
                  '& .MuiSlider-rail': {
                    height: 6,
                  }
                }}
              />
            </Box>
          </Box>

          {/* Instructions */}
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            Drag the image left/right to rotate • Use slider for precise control • Click play for auto-rotation
          </Typography>
        </CardContent>
      </Card>

      {/* Fullscreen Styles */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  );
};

export default ImageSlider360;