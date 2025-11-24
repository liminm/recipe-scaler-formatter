'use client';

import { useState, useEffect, useRef } from 'react';
import { useChili } from '@/context/ChiliContext';
import { DUMPLING_JOKES } from '@/data/dumplingJokes';
import { CHILI_JOKES } from '@/data/chiliJokes';

/**
 * IdleDumplingManager
 * Manages global idle animations for the mascot.
 * Shows dumpling by default, or chili in Chili Mode.
 * 
 * Features:
 * 1. Screen Walker: Hops across bottom of screen.
 * 2. Corner Companion: Interactive pet in bottom-right.
 * 3. Nav Bar Peeker: Peeks from top.
 * 4. Scroll Surfer: Rides the scrollbar.
 */
export default function IdleDumplingManager() {
  const { isChiliMode } = useChili();
  const mascotImage = isChiliMode ? '/chili.png' : '/dumpling-logo.png';
  
  // Hover message variations
  const hoverMessages = [
    'Click me! 👆',
    'Press me for wisdom! 🧠',
    'I have secrets... 🤫',
    'Tap me! ✨',
    'Want to hear something funny? 😄',
    'Click for a surprise! 🎁',
    'I know things... 👀',
    'Press for dumpling facts! 📚',
    'Psst... click me! 🗣️',
    'I\'ve got jokes! 🎭',
    'Give me a click! 👈',
    'Tap for wisdom! 🦉',
    'Click if you dare! 😏',
    'I have stories! 📖',
    'Press me pretty please! 🙏',
    'Click for enlightenment! 💡',
    'Want some knowledge? 🎓',
    'I\'m clickable! 🖱️',
    'Try clicking me! 🎯',
    'Press for fun facts! 🎉'
  ];
  
  const [hoverMessage, setHoverMessage] = useState('');

  // --- 1. Screen Walker State ---
  const [walkerState, setWalkerState] = useState<'idle' | 'walking'>('idle');
  const [walkerX, setWalkerX] = useState(-100); // Start off-screen left

  // --- 2. Corner Companion State ---
  const [companionHover, setCompanionHover] = useState(false);
  const [showJoke, setShowJoke] = useState(false);
  const [currentJoke, setCurrentJoke] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const jokeHideTimeout = useRef<NodeJS.Timeout | null>(null);
  const bubbleHideTimeout = useRef<NodeJS.Timeout | null>(null);
  const bubbleFadeTimeout = useRef<NodeJS.Timeout | null>(null);
  const bubbleInactivityTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- 3. Nav Peeker State ---
  const [peekerState, setPeekerState] = useState<'hidden' | 'peeking'>('hidden');
  const [peekerX, setPeekerX] = useState(50); // Percent

  // --- 4. Scroll Surfer State ---
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Handle joke click
  const handleCompanionClick = () => {
    const pool = isChiliMode ? CHILI_JOKES : DUMPLING_JOKES;
    const randomJoke = pool[Math.floor(Math.random() * pool.length)];
    setCurrentJoke(randomJoke);
    setShowJoke(true);
    setBubbleVisible(true);
    if (jokeHideTimeout.current) {
      clearTimeout(jokeHideTimeout.current);
      jokeHideTimeout.current = null;
    }
    if (bubbleHideTimeout.current) {
      clearTimeout(bubbleHideTimeout.current);
      bubbleHideTimeout.current = null;
    }
    if (bubbleFadeTimeout.current) {
      clearTimeout(bubbleFadeTimeout.current);
      bubbleFadeTimeout.current = null;
    }
    if (bubbleInactivityTimeout.current) {
      clearTimeout(bubbleInactivityTimeout.current);
      bubbleInactivityTimeout.current = null;
    }
    // Auto dismiss after inactivity (~10s)
    bubbleInactivityTimeout.current = setTimeout(() => {
      setBubbleVisible(false);
      bubbleHideTimeout.current = setTimeout(() => setShowJoke(false), 500);
    }, 10000);
  };

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (jokeHideTimeout.current) clearTimeout(jokeHideTimeout.current);
      if (bubbleHideTimeout.current) clearTimeout(bubbleHideTimeout.current);
      if (bubbleFadeTimeout.current) clearTimeout(bubbleFadeTimeout.current);
      if (bubbleInactivityTimeout.current) clearTimeout(bubbleInactivityTimeout.current);
    };
  }, []);

  const resetInactivity = () => {
    if (bubbleInactivityTimeout.current) {
      clearTimeout(bubbleInactivityTimeout.current);
      bubbleInactivityTimeout.current = null;
    }
    bubbleInactivityTimeout.current = setTimeout(() => {
      setBubbleVisible(false);
      bubbleHideTimeout.current = setTimeout(() => setShowJoke(false), 500);
    }, 10000);
  };

  // Set random hover message on mount
  useEffect(() => {
    setHoverMessage(hoverMessages[Math.floor(Math.random() * hoverMessages.length)]);
  }, []);

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
          pointerEvents: 'auto',
          cursor: 'pointer'
        }}
        onClick={() => setWalkerState('idle')}
        >
          <img src={mascotImage} alt="Walker" style={{ width: '100%', height: '100%' }} />
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
        cursor: 'pointer'
      }}
      onMouseEnter={() => {
        setCompanionHover(true);
        setHoverMessage(hoverMessages[Math.floor(Math.random() * hoverMessages.length)]);
      }}
      onMouseLeave={() => setCompanionHover(false)}
      onClick={handleCompanionClick}
      >
        <img 
          src={mascotImage} 
          alt="Companion" 
          style={{ 
            width: '100%', 
            height: '100%',
            animation: companionHover ? 'spin-wobble 2s infinite' : 'breathe 4s ease-in-out infinite'
          }} 
        />
        
        {/* Joke bubble - larger and more visible */}
        {showJoke && (
          <div style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            minWidth: '250px',
            maxWidth: '350px',
            background: isChiliMode ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 'linear-gradient(135deg, #fff, #f8f9fa)',
            padding: '12px 16px',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            opacity: bubbleVisible ? 1 : 0,
            transition: 'opacity 0.35s ease',
            fontSize: '0.875rem',
            pointerEvents: 'auto',
            border: isChiliMode ? '2px solid #fff' : '2px solid #8b6f47',
            color: isChiliMode ? '#fff' : '#333',
            lineHeight: 1.4,
            fontStyle: 'italic',
            zIndex: 10000
          }}
          onMouseEnter={() => {
            setBubbleVisible(true);
            if (bubbleHideTimeout.current) {
              clearTimeout(bubbleHideTimeout.current);
              bubbleHideTimeout.current = null;
            }
            if (bubbleFadeTimeout.current) {
              clearTimeout(bubbleFadeTimeout.current);
              bubbleFadeTimeout.current = null;
            }
            resetInactivity();
          }}
          onMouseLeave={() => {
            if (bubbleHideTimeout.current) clearTimeout(bubbleHideTimeout.current);
            if (bubbleFadeTimeout.current) clearTimeout(bubbleFadeTimeout.current);
            bubbleFadeTimeout.current = setTimeout(() => setBubbleVisible(false), 1200);
            bubbleHideTimeout.current = setTimeout(() => setShowJoke(false), 1500);
          }}
          >
            <div style={{ 
              fontWeight: 600, 
              marginBottom: '4px',
              fontSize: '0.75rem',
              opacity: 0.8
            }}>
              {isChiliMode ? '🌶️ Spicy Fact:' : '🥟 Dumpling Wisdom:'}
            </div>
            {currentJoke}
            <button
              onClick={() => setShowJoke(false)}
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                border: 'none',
                background: 'transparent',
                color: isChiliMode ? '#fff' : '#8b6f47',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                lineHeight: 1
              }}
              aria-label="Close joke"
            >
              ×
            </button>
            
            {/* Little triangle pointer */}
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              right: '15px',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: `10px solid ${isChiliMode ? '#e74c3c' : '#f8f9fa'}`
            }} />
          </div>
        )}
        
        {/* Hover hint bubble */}
        {!showJoke && (
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '0',
            background: isChiliMode ? 'linear-gradient(135deg, #ffcccc, #ffdddd)' : 'white',
            padding: '5px 10px',
            borderRadius: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            opacity: companionHover ? 1 : 0,
            transition: 'opacity 0.2s',
            whiteSpace: 'nowrap',
            fontSize: '12px',
            pointerEvents: 'none',
            border: isChiliMode ? '1px solid #ff6b6b' : 'none'
          }}>
            {hoverMessage}
          </div>
        )}
      </div>

      {/* 3. Nav Peeker */}
      <div style={{
        position: 'absolute',
        top: peekerState === 'peeking' ? '50px' : '-60px',
        left: `${peekerX}%`,
        width: '40px',
        height: '40px',
        transition: 'top 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: 'rotate(180deg)'
      }}>
         <img src={mascotImage} alt="Peeker" style={{ width: '100%', height: '100%' }} />
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
        <img src={mascotImage} alt="Surfer" style={{ width: '100%', height: '100%' }} />
        {/* Speed lines */}
        {isScrolling && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '10px',
            width: '2px',
            height: '20px',
            background: isChiliMode ? 'rgba(255, 107, 107, 0.3)' : 'rgba(0,0,0,0.2)',
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
