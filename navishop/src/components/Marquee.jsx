import { useEffect, useRef, useState } from 'react';

const Marquee = ({
  children,
  direction = 'left',
  speed = 60,
  pauseOnHover = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) return;

    // Wait for content to be rendered and measured
    const timer = setTimeout(() => {
      const contentWidth = content.scrollWidth;
      const containerWidth = container.clientWidth;

      // Calculate duration based on content width and speed (pixels per second)
      const duration = contentWidth / speed;

      // Set CSS custom properties for the animation
      container.style.setProperty('--content-width', `${contentWidth}px`);
      container.style.setProperty('--animation-duration', `${duration}s`);
      container.style.setProperty('--direction', direction === 'left' ? '-1' : '1');

      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [children, speed, direction]);

  return (
    <div
      className={`marquee-container ${className}`}
      ref={containerRef}
      style={{
        overflow: 'hidden',
        position: 'relative',
        width: '100%'
      }}
    >
      <div
        className={`marquee-content ${isReady ? 'animate' : ''}`}
        style={{
          display: 'flex',
          animation: isReady ? `marquee-scroll var(--animation-duration, 30s) linear infinite` : 'none',
          animationPlayState: 'running'
        }}
        onMouseEnter={(e) => {
          if (pauseOnHover) {
            e.currentTarget.style.animationPlayState = 'paused';
          }
        }}
        onMouseLeave={(e) => {
          if (pauseOnHover) {
            e.currentTarget.style.animationPlayState = 'running';
          }
        }}
      >
        {/* Multiple copies to ensure smooth infinite scroll */}
        <div ref={contentRef} className="flex shrink-0">
          {children}
        </div>
        <div className="flex shrink-0">
          {children}
        </div>
        <div className="flex shrink-0">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(var(--content-width, 1000px) * var(--direction, -1)));
          }
        }

        .marquee-content {
          will-change: transform;
        }

        .marquee-content.animate {
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
};

export default Marquee;