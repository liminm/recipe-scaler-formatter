'use client';

import { useState, useRef } from 'react';
import { useDebug } from '@/context/DebugContext';

export default function NavBar() {
  const { toggleDebugMode } = useDebug();
  const [clickCount, setClickCount] = useState(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    // Clear any existing reset timer
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    // Check if we've reached 5 clicks
    if (newCount >= 5) {
      e.preventDefault();
      toggleDebugMode();
      setClickCount(0);
      resetTimerRef.current = null;
    } else {
      // Reset count after 2 seconds of inactivity
      resetTimerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 2000);
    }
  };

  return (
    <nav className="topbar">
      <div className="container topbar-content">
        <a href="/" className="brand" onClick={handleLogoClick} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img src="/dumpling-logo.png" alt="Dumpling Maker" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          <span>Dumpling Maker</span>
        </a>
        <div className="nav-links">
          <a href="/events" className="nav-link">Events</a>
          <a href="/recipes" className="nav-link">Recipes</a>
          <a href="/staging" className="nav-link active">+ Ingest</a>
        </div>
      </div>
    </nav>
  );
}
