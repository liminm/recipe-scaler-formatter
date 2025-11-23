'use client';

import { useState, useRef } from 'react';
import { useChili } from '@/context/ChiliContext';

export default function NavBar() {
  const { toggleChiliMode, isChiliMode } = useChili();
  const [clickCount, setClickCount] = useState(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation on ALL clicks
    
    // Clear any existing reset timer
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    // Check if we've reached 5 clicks
    if (newCount >= 5) {
      toggleChiliMode();
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
    <nav className="topbar" style={{
      background: isChiliMode 
        ? 'linear-gradient(135deg, #c92a2a 0%, #e03131 100%)'
        : undefined
    }}>
      <div className="container topbar-content">
        <a href="/" className="brand" onClick={handleLogoClick} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', cursor: 'pointer' }}>
          <img 
            src={isChiliMode ? "/chili.png" : "/dumpling-logo.png"} 
            alt={isChiliMode ? "Chili Dumpling Maker" : "Dumpling Maker"}
            style={{ width: '32px', height: '32px', borderRadius: '50%' }} 
          />
          <span>{isChiliMode ? "🌶️ Chili Dumpling Maker" : "Dumpling Maker"}</span>
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
