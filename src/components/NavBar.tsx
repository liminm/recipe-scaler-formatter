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
  const [animationClass, setAnimationClass] = useState('');

  const triggerRandomAnimation = () => {
    if (animationClass) return; // Don't interrupt existing animation
    const animations = ['anim-bounce', 'anim-wiggle', 'anim-jelly', 'anim-spin', 'anim-tada'];
    const randomAnim = animations[Math.floor(Math.random() * animations.length)];
    setAnimationClass(randomAnim);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent ALL navigation by default
    triggerRandomAnimation();

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
        <Link 
          href="/" 
          className="brand" 
          onClick={handleLogoClick}
          onMouseEnter={triggerRandomAnimation}
        >
          {isChiliMode ? (
            <>
              <span className="brand-mark">
                <img src="/chili.png" alt="Chili Dumpling Maker" />
              </span>
              <span className="brand-text">Chili Dumpling Maker</span>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img 
                src="/dumpling-logo.png" 
                alt="Dumpling Maker" 
                className={animationClass}
                onAnimationEnd={() => setAnimationClass('')}
                style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
              />
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                lineHeight: 0.9,
                fontFamily: 'var(--font-nunito)', 
                fontWeight: 800, 
                color: '#4a3728' 
              }}>
                <span style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Dumpling</span>
                <span style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Maker</span>
              </div>
            </div>
          )}
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
