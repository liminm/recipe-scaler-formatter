'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ChiliContextType {
  isChiliMode: boolean;
  toggleChiliMode: () => void;
  enableChiliMode: () => void;
  disableChiliMode: () => void;
}

const ChiliContext = createContext<ChiliContextType | undefined>(undefined);

export function ChiliProvider({ children }: { children: React.ReactNode }) {
  const [isChiliMode, setIsChiliMode] = useState(false);

  // Persist chili mode in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('chili_mode');
    if (stored === 'true') {
      setIsChiliMode(true);
    }
  }, []);

  const toggleChiliMode = () => {
    const newState = !isChiliMode;
    setIsChiliMode(newState);
    localStorage.setItem('chili_mode', String(newState));
    
    // Visual feedback
    if (newState) {
      alert('🌶️ CHILI MODE ACTIVATED: Extra spicy features enabled!');
    } else {
      alert('🥟 Back to regular Dumpling Mode');
    }
  };

  const enableChiliMode = () => {
    setIsChiliMode(true);
    localStorage.setItem('chili_mode', 'true');
  };

  const disableChiliMode = () => {
    setIsChiliMode(false);
    localStorage.setItem('chili_mode', 'false');
  };

  return (
    <ChiliContext.Provider value={{ isChiliMode, toggleChiliMode, enableChiliMode, disableChiliMode }}>
      {children}
      {isChiliMode && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          background: 'linear-gradient(135deg, #c92a2a 0%, #e03131 100%)',
          color: '#fff',
          padding: '0.5rem 1rem',
          borderRadius: '2rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(201, 42, 42, 0.3)'
        }}>
          🌶️ CHILI MODE
        </div>
      )}
    </ChiliContext.Provider>
  );
}

export function useChili() {
  const context = useContext(ChiliContext);
  if (context === undefined) {
    throw new Error('useChili must be used within a ChiliProvider');
  }
  return context;
}
