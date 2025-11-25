'use client';

import { useState, useEffect } from 'react';
import { useChili } from '@/context/ChiliContext';
import { DUMPLING_JOKES } from '@/data/dumplingJokes';
import { CHILI_JOKES } from '@/data/chiliJokes';

interface LoadingDumplingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function LoadingDumpling({ message, size = 'medium' }: LoadingDumplingProps) {
  const { isChiliMode } = useChili();
  const [mounted, setMounted] = useState(false);
  const [joke, setJoke] = useState('');
  const [animationClass, setAnimationClass] = useState('');

  const sizeMap = {
    small: 48,
    medium: 80,
    large: 120
  };
  
  const pxSize = sizeMap[size];

  // Animation lists
  const chiliAnimations = [
    'anim-chili-fire-breath', 'anim-chili-sizzle', 'anim-chili-hiccup', 
    'anim-chili-flame-flicker', 'anim-chili-charred', 'anim-chili-heat-stroke', 
    'anim-chili-dragon-flip', 'anim-chili-pepper-sneeze', 'anim-chili-red-alert', 
    'anim-chili-combustion'
  ];

  const dumplingAnimations = [
    'anim-dumpling-bounce-walk',
    'anim-dumpling-excited-hop',
    'anim-dumpling-walk',
    'anim-dumpling-tumble'
  ];

  useEffect(() => {
    setMounted(true);
    
    const pool = isChiliMode ? CHILI_JOKES : DUMPLING_JOKES;
    setJoke(pool[Math.floor(Math.random() * pool.length)]);

    // Initial animation
    const anims = isChiliMode ? chiliAnimations : dumplingAnimations;
    setAnimationClass(anims[Math.floor(Math.random() * anims.length)]);

    // Cycle jokes every 10 seconds
    const jokeInterval = setInterval(() => {
      const nextPool = isChiliMode ? CHILI_JOKES : DUMPLING_JOKES;
      setJoke(nextPool[Math.floor(Math.random() * nextPool.length)]);
    }, 10000);

    // Cycle animations every 4 seconds
    const animInterval = setInterval(() => {
      const currentAnims = isChiliMode ? chiliAnimations : dumplingAnimations;
      setAnimationClass(currentAnims[Math.floor(Math.random() * currentAnims.length)]);
    }, 4000);

    return () => {
      clearInterval(jokeInterval);
      clearInterval(animInterval);
    };
  }, [isChiliMode]);

  if (!mounted) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      padding: '2rem',
      width: '100%',
      minHeight: '300px'
    }}>
      <div className={animationClass}>
        <img 
          src={isChiliMode ? "/chili.png" : "/dumpling-logo.png"} 
          alt="Loading..." 
          style={{ width: `${pxSize}px`, height: `${pxSize}px`, objectFit: 'contain' }} 
        />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
        {message && (
          <p className="text-muted" style={{ 
            fontSize: '1rem',
            fontWeight: 600,
            animation: 'pulse 2s infinite'
          }}>
            {message}
          </p>
        )}
        
        <div style={{
          maxWidth: '400px',
          padding: '1rem',
          background: isChiliMode ? 'rgba(192, 57, 43, 0.1)' : 'rgba(255, 255, 255, 0.5)',
          borderRadius: '1rem',
          border: `1px solid ${isChiliMode ? 'rgba(192, 57, 43, 0.2)' : 'rgba(0,0,0,0.05)'}`,
          backdropFilter: 'blur(4px)'
        }}>
          <p style={{ 
            fontSize: '0.9rem', 
            color: isChiliMode ? '#c0392b' : '#666',
            fontStyle: 'italic',
            margin: 0,
            lineHeight: 1.5
          }}>
            "{joke}"
          </p>
        </div>
      </div>
    </div>
  );
}
