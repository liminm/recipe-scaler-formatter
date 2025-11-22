'use client';

import { useState, useEffect, useRef } from 'react';

interface LoadingDumplingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

type AnimationType = 'jump' | 'flip' | 'spin-wobble' | 'peek' | 'dvd';

export default function LoadingDumpling({ message, size = 'medium' }: LoadingDumplingProps) {
  const [animation, setAnimation] = useState<AnimationType>('jump');
  const [mounted, setMounted] = useState(false);
  
  // DVD Animation State
  const [dvdPos, setDvdPos] = useState({ x: 0, y: 0 });
  const [dvdHue, setDvdHue] = useState(0);
  // --- 4. Scroll Surfer State ---
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const velocityRef = useRef({ dx: 2, dy: 2 });
  const posRef = useRef({ x: 0, y: 0 });

  const sizeMap = {
    small: 48,
    medium: 80,
    large: 120
  };
  
  const pxSize = sizeMap[size];

  useEffect(() => {
    setMounted(true);
    // Randomly pick an animation
    // Weighted: 'jump' is classic, so give it slightly higher chance
    const types: AnimationType[] = ['jump', 'jump', 'flip', 'spin-wobble', 'peek', 'dvd'];
    // Only allow DVD for medium/large as it needs space
    const availableTypes = size === 'small' ? types.filter(t => t !== 'dvd') : types;
    
    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    setAnimation(randomType);
  }, [size]);

  // DVD Animation Loop
  useEffect(() => {
    if (animation !== 'dvd' || !containerRef.current) return;

    const animate = () => {
      if (!containerRef.current) return;
      
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight || 300; // Fallback height
      const dumplingSize = pxSize;
      
      let { x, y } = posRef.current;
      let { dx, dy } = velocityRef.current;
      
      x += dx;
      y += dy;
      
      let bounced = false;
      
      // Bounce X
      if (x + dumplingSize >= containerW || x <= 0) {
        dx = -dx;
        x = Math.max(0, Math.min(x, containerW - dumplingSize));
        bounced = true;
      }
      
      // Bounce Y
      if (y + dumplingSize >= containerH || y <= 0) {
        dy = -dy;
        y = Math.max(0, Math.min(y, containerH - dumplingSize));
        bounced = true;
      }
      
      if (bounced) {
        setDvdHue(h => (h + 60) % 360);
      }
      
      posRef.current = { x, y };
      velocityRef.current = { dx, dy };
      setDvdPos({ x, y });
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animation, pxSize]);

  if (!mounted) return null;

  // Container styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    padding: '2rem',
    width: '100%',
    minHeight: animation === 'dvd' ? '300px' : 'auto',
    position: 'relative',
    overflow: 'hidden' // For peek and dvd
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      {animation === 'dvd' ? (
        <div 
          style={{
            position: 'absolute',
            left: dvdPos.x,
            top: dvdPos.y,
            filter: `hue-rotate(${dvdHue}deg)`,
            transition: 'filter 0.5s ease'
          }}
        >
          <img 
            src="/dumpling-logo.png" 
            alt="Loading..." 
            style={{ width: `${pxSize}px`, height: `${pxSize}px` }} 
          />
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div className={`dumpling-anim-${animation}`}>
            <img 
              src="/dumpling-logo.png" 
              alt="Loading..." 
              style={{ width: `${pxSize}px`, height: `${pxSize}px`, position: 'relative', zIndex: 2 }} 
            />
          </div>
          {animation === 'jump' && (
            <div className="dust-cloud" style={{
              position: 'absolute',
              bottom: '-5px',
              width: `${pxSize * 0.8}px`,
              height: `${pxSize * 0.2}px`,
              background: 'radial-gradient(ellipse at center, rgba(139, 111, 71, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              zIndex: 1
            }} />
          )}
        </div>
      )}
      
      {message && (
        <p className="text-muted" style={{ 
          fontSize: '0.9375rem',
          textAlign: 'center',
          maxWidth: '300px',
          animation: 'fade-pulse 2s ease-in-out infinite',
          zIndex: 10, // Ensure text is above peek animation
          background: animation === 'dvd' ? 'rgba(255,255,255,0.8)' : 'transparent',
          padding: animation === 'dvd' ? '0.5rem' : 0,
          borderRadius: '0.5rem'
        }}>
          {message}
        </p>
      )}

      <style jsx>{`
        .dumpling-anim-jump {
          animation: jump 1s ease-in-out infinite;
          transform-origin: center bottom;
        }
        
        .dust-cloud {
          animation: dust 1s ease-in-out infinite;
          opacity: 0;
        }
        
        .dumpling-anim-flip {
          animation: flip 1.5s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .dumpling-anim-spin-wobble {
          animation: spin-wobble 2s ease-in-out infinite;
          transform-origin: center center;
        }
        
        .dumpling-anim-peek {
          animation: peek 3s ease-in-out infinite;
        }

        @keyframes fade-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
