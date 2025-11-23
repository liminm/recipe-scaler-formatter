'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DebugContextType {
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  enableDebugMode: () => void;
  disableDebugMode: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [isDebugMode, setIsDebugMode] = useState(false);

  // Persist debug mode in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('debug_mode');
    if (stored === 'true') {
      setIsDebugMode(true);
    }
  }, []);

  const toggleDebugMode = () => {
    const newState = !isDebugMode;
    setIsDebugMode(newState);
    localStorage.setItem('debug_mode', String(newState));
    
    // Visual feedback
    if (newState) {
      alert('🔧 Developer Mode ENABLED: LLM model info will now be visible.');
    } else {
      alert('Developer Mode Disabled.');
    }
  };

  const enableDebugMode = () => {
    setIsDebugMode(true);
    localStorage.setItem('debug_mode', 'true');
  };

  const disableDebugMode = () => {
    setIsDebugMode(false);
    localStorage.setItem('debug_mode', 'false');
  };

  return (
    <DebugContext.Provider value={{ isDebugMode, toggleDebugMode, enableDebugMode, disableDebugMode }}>
      {children}
      {isDebugMode && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          background: 'rgba(0,0,0,0.8)',
          color: '#0f0',
          padding: '0.5rem 1rem',
          borderRadius: '2rem',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          DEV MODE ACTIVE
        </div>
      )}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}
