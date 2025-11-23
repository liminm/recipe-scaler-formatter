'use client';

import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChili } from '@/context/ChiliContext';

const links = [
  { href: '/events', label: 'Events' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/staging', label: '+ Ingest' },
];

export default function NavBar() {
  const pathname = usePathname();
  const { toggleChiliMode, isChiliMode } = useChili();
  const [clickCount, setClickCount] = useState(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent ALL navigation by default

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 5) {
      toggleChiliMode();
      setClickCount(0);
      resetTimerRef.current = null;
    } else {
      resetTimerRef.current = setTimeout(() => {
        if (clickCount + 1 === 1) {
          window.location.href = '/';
        }
        setClickCount(0);
      }, 400); // 400ms delay to detect multi-clicks
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className={`topbar ${isChiliMode ? 'chili-nav' : ''}`}>
      <div className="container topbar-content">
        <a href="/" className="brand" onClick={handleLogoClick}>
          <span className="brand-mark">
            <img
              src={isChiliMode ? '/chili.png' : '/dumpling-logo.png'}
              alt={isChiliMode ? 'Chili Dumpling Maker' : 'Dumpling Maker'}
            />
          </span>
          <span className="brand-text">
            {isChiliMode ? 'Chili Dumpling Maker' : 'Dumpling Maker'}
          </span>
        </a>
        <div className="nav-links">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
              aria-current={isActive(link.href) ? 'page' : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
