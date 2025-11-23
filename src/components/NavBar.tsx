'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { useChili } from '@/context/ChiliContext';

const links = [
  { href: '/events', label: 'Events' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/staging', label: '+ Ingest' },
];

export default function NavBar() {
  const router = useRouter();
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
          router.push('/');
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
        <Link href="/" className="brand" onClick={handleLogoClick}>
          <span className="brand-mark">
            <img
              src={isChiliMode ? '/chili.png' : '/dumpling-logo.png'}
              alt={isChiliMode ? 'Chili Dumpling Maker' : 'Dumpling Maker'}
            />
          </span>
          <span className="brand-text">
            {isChiliMode ? 'Chili Dumpling Maker' : 'Dumpling Maker'}
          </span>
        </Link>
        <div className="nav-links">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
              aria-current={isActive(link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
