import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { useState } from 'react'; // Added useState import

import IdleDumplingManager from '@/components/IdleDumplingManager';
import { DebugProvider, useDebug } from '@/context/DebugContext'; // Added useDebug import

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Dumpling Maker',
  description: 'Logistics and production engine for social cooking events.',
};

// Separate component to access context
function NavBar() {
  const { toggleDebugMode } = useDebug();
  const [clickCount, setClickCount] = useState(0);

  const handleLogoClick = (e: React.MouseEvent) => {
    // If user clicks 5 times quickly, toggle debug mode
    setClickCount(prev => prev + 1);
    
    // Reset count after 1 second
    setTimeout(() => setClickCount(0), 1000);

    if (clickCount >= 4) {
      e.preventDefault();
      toggleDebugMode();
      setClickCount(0);
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrains.variable}`}>
        <DebugProvider>
          <IdleDumplingManager />
          <div className="app-shell">
            <NavBar />
            <main className="container main-content">
              {children}
            </main>
            <footer className="footer">
              <p>Dumpling Maker &copy; 2025</p>
            </footer>
          </div>
        </DebugProvider>
      </body>
    </html>
  );
}
