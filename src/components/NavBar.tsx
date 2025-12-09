'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { useChili } from '@/context/ChiliContext';

const links = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/events', label: 'Events', icon: '📅' },
  { href: '/recipes', label: 'Recipes', icon: '📖' },
];

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleChiliMode, isChiliMode } = useChili();
  const [clickCount, setClickCount] = useState(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [animationClass, setAnimationClass] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const lastAnimationRef = useRef<string>('');

  // Close drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const triggerRandomAnimation = () => {
    if (animationClass) return;
    
    let animations;
    if (isChiliMode) {
      animations = [
        'anim-chili-fire-breath', 'anim-chili-sizzle', 'anim-chili-hiccup', 
        'anim-chili-flame-flicker', 'anim-chili-charred', 'anim-chili-heat-stroke', 
        'anim-chili-dragon-flip', 'anim-chili-pepper-sneeze', 'anim-chili-red-alert', 
        'anim-chili-combustion'
      ];
    } else {
      animations = [
        'anim-dumpling-steam-rise', 'anim-dumpling-pot-bobble', 'anim-dumpling-chopstick-squeeze',
        'anim-dumpling-rolling-dough', 'anim-dumpling-soy-dip', 'anim-dumpling-happy-hop',
        'anim-dumpling-pleat-pulse', 'anim-dumpling-plate-slide', 'anim-dumpling-tummy-rub',
        'anim-dumpling-fresh-fold'
      ];
    }
    
    let randomAnim;
    do {
      randomAnim = animations[Math.floor(Math.random() * animations.length)];
    } while (randomAnim === lastAnimationRef.current && animations.length > 1);

    lastAnimationRef.current = randomAnim;
    setAnimationClass(randomAnim);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
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
      }, 400);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleMobileNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  const logoSrc = isChiliMode ? '/chili.png' : '/dumpling-logo.png';
  const logoAlt = isChiliMode ? 'Chili Dumpling Maker' : 'Dumpling Maker';

  return (
    <>
      <nav className={`topbar mobile-topbar-compact ${isChiliMode ? 'chili-nav' : ''}`}>
        <div className="container topbar-content">
          {/* Logo - compact on mobile */}
          <Link 
            href="/" 
            className="brand" 
            onClick={handleLogoClick}
            onMouseEnter={triggerRandomAnimation}
          >
            <img 
              src={logoSrc}
              alt={logoAlt}
              className={`brand-logo ${animationClass}`}
              onAnimationEnd={() => setAnimationClass('')}
            />
            {/* Brand text - hidden on mobile */}
            <div className="brand-text-container mobile-hide">
              {isChiliMode ? (
                <div className="brand-text brand-text-chili">
                  <span>Chili Dumpling</span>
                  <span>Maker 🌶️</span>
                </div>
              ) : (
                <div className="brand-text">
                  <span>Dumpling</span>
                  <span>Maker</span>
                </div>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-links mobile-hide">
            {links.filter(l => l.href !== '/').map((link) => (
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

          {/* Mobile Hamburger Button - integrated in header */}
          <button 
            className="mobile-menu-toggle mobile-show mobile-show-flex"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`mobile-nav-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Slide-in Drawer */}
      <aside className={`mobile-nav-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-drawer-header">
          <div className="mobile-nav-drawer-brand">
            <img src={logoSrc} alt={logoAlt} className="mobile-nav-drawer-logo" />
            <span className="mobile-nav-drawer-title">
              {isChiliMode ? 'Chili Maker' : 'Dumpling Maker'}
            </span>
          </div>
          <button 
            className="mobile-nav-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        
        <nav className="mobile-nav-drawer-links">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleMobileNavClick}
              className={`mobile-nav-drawer-link ${isActive(link.href) ? 'active' : ''}`}
              aria-current={isActive(link.href) ? 'page' : undefined}
            >
              <span className="mobile-nav-drawer-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
