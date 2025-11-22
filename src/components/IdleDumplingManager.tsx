'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * IdleDumplingManager
 * Manages global idle animations for the dumpling mascot.
 * 
 * Features:
 * 1. Screen Walker: Hops across bottom of screen.
 * 2. Corner Companion: Interactive pet in bottom-right.
 * 3. Nav Bar Peeker: Peeks from top.
 * 4. Scroll Surfer: Rides the scrollbar.
 */
export default function IdleDumplingManager() {
  // --- 1. Screen Walker State ---
  const [walkerState, setWalkerState] = useState<'idle' | 'walking'>('idle');
  const [walkerX, setWalkerX] = useState(-100); // Start off-screen left

  // --- 2. Corner Companion State ---
  const [companionHover, setCompanionHover] = useState(false);

  // --- 3. Nav Peeker State ---
  const [peekerState, setPeekerState] = useState<'hidden' | 'peeking'>('hidden');
  const [peekerX, setPeekerX] = useState(50); // Percent

  // --- 4. Scroll Surfer State ---
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- Logic: Screen Walker ---
  useEffect(() => {
    // Walk every 45-90 seconds
    const scheduleWalk = () => {
      const delay = Math.random() * 45000 + 45000;
      return setTimeout(() => {
        setWalkerState('walking');
        // Walk duration: 10s
        const startTime = Date.now();
        const duration = 10000;
        
        const animateWalk = () => {
          const elapsed = Date.now() - startTime;
          const progress = elapsed / duration;
          
          if (progress < 1) {
            // Move from -5% to 105% of screen width
            setWalkerX(-5 + progress * 110);
            requestAnimationFrame(animateWalk);
          } else {
            setWalkerState('idle');
            setWalkerX(-100);
            scheduleWalk(); // Schedule next walk
          }
        };
        requestAnimationFrame(animateWalk);
      }, delay);
    };

    const timer = scheduleWalk();
    return () => clearTimeout(timer);
  }, []);

  // --- Logic: Nav Peeker ---
  useEffect(() => {
    // Peek every 30-60 seconds
    const schedulePeek = () => {
      const delay = Math.random() * 30000 + 30000;
      return setTimeout(() => {
        setPeekerX(Math.random() * 80 + 10); // Random X position (10-90%)
        setPeekerState('peeking');
        
        // Hide after 3s
        setTimeout(() => {
          setPeekerState('hidden');
          schedulePeek();
        }, 3000);
      }, delay);
    };

    const timer = schedulePeek();
    return () => clearTimeout(timer);
  }, []);

  // --- Logic: Scroll Surfer ---
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1000); // Hide 1s after scrolling stops
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  return (
    <div className="idle-dumpling-layer" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      pointerEvents: 'none', 
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      
      {/* 1. Screen Walker */}
      {walkerState === 'walking' && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: `${walkerX}%`,
          width: '60px',
          height: '60px',
          animation: 'jump 0.8s ease-in-out infinite',
          transformOrigin: 'bottom center',
          pointerEvents: 'auto', // Allow clicking to scare it?
          cursor: 'pointer'
        }}
        onClick={() => setWalkerState('idle')} // Click to hide
        >
          <img src="/dumpling-logo.png" alt="Walker" style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {/* 2. Corner Companion */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '50px',
        height: '50px',
        pointerEvents: 'auto',
        transition: 'transform 0.3s ease',
        transform: companionHover ? 'scale(1.2) translateY(-10px)' : 'scale(1)',
        cursor: 'grab'
      }}
      onMouseEnter={() => setCompanionHover(true)}
      onMouseLeave={() => setCompanionHover(false)}
      >
        <img 
          src="/dumpling-logo.png" 
          alt="Companion" 
          style={{ 
            width: '100%', 
            height: '100%',
            animation: companionHover ? 'spin-wobble 2s infinite' : 'breathe 4s ease-in-out infinite'
          }} 
        />
        {/* Little speech bubble on hover */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '0',
          background: 'white',
          padding: '5px 10px',
          borderRadius: '10px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          opacity: companionHover ? 1 : 0,
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
          fontSize: '12px',
          pointerEvents: 'none'
        }}>
          Hi there! 🥟
        </div>
      </div>

      {/* 3. Nav Peeker */}
      <div style={{
        position: 'absolute',
        top: peekerState === 'peeking' ? '50px' : '-60px', // Peek below nav bar (approx 64px height)
        left: `${peekerX}%`,
        width: '40px',
        height: '40px',
        transition: 'top 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: 'rotate(180deg)', // Upside down peeking from top
        zIndex: -1 // Behind nav bar? No, layer is z-9999. 
        // Actually, if zIndex is 9999, it's on top of everything.
        // To peek "from behind" the nav bar, we need to be clever.
        // Or just peek "over" the nav bar.
        // Let's peek "over" the top edge of the screen, so it overlaps the nav bar.
      }}>
         <img src="/dumpling-logo.png" alt="Peeker" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* 4. Scroll Surfer */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '10px',
        width: '40px',
        height: '40px',
        transform: `translateY(-50%) ${isScrolling ? 'rotate(-15deg) scale(1.1)' : 'translateX(100px)'}`,
        transition: 'transform 0.3s ease',
        opacity: isScrolling ? 1 : 0
      }}>
        <img src="/dumpling-logo.png" alt="Surfer" style={{ width: '100%', height: '100%' }} />
        {/* Speed lines */}
        {isScrolling && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '10px',
            width: '2px',
            height: '20px',
            background: 'rgba(0,0,0,0.2)',
            transform: 'rotate(15deg)'
          }} />
        )}
      </div>

      <style jsx>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
