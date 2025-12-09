import Link from 'next/link';
import KitchenWisdom from '@/components/KitchenWisdom';

const highlights = [
  {
    icon: '📅',
    title: 'Events',
    desc: 'Create cooking sessions with headcount and target mass. Build menus and scale recipes automatically.',
    mobileDesc: 'Plan group cooking sessions',
    actions: [
      { label: 'View All', href: '/events', variant: 'secondary' },
      { label: 'New Event', href: '/events/new', variant: 'primary' },
    ],
  },
  {
    icon: '📖',
    title: 'Recipes',
    desc: 'Browse and manage your collection of recipes. All quantities stored in metric for consistent scaling.',
    mobileDesc: 'Browse your recipe collection',
    actions: [
      { label: 'Browse', href: '/recipes', variant: 'secondary' },
      { label: 'Ingest New', href: '/staging', variant: 'primary' },
    ],
  },
];

export default function Home() {
  return (
    <div className="home">
      <section className="home-hero mobile-hero-compact">
        <div className="hero-shell">

          <h1 className="hero-title">
            <span className="mobile-hide">What are we cooking today?</span>
            <span className="mobile-show mobile-show-inline">Let&apos;s cook!</span>
          </h1>
          <p className="hero-subtitle mobile-hide">
            Scale recipes, build menus, and feed the crowd.
          </p>

          <form action="/staging" method="GET" className="hero-search">
            <input
              type="text"
              name="q"
              placeholder="Paste recipe URL or text..."
              className="input-field hero-input"
              autoFocus
            />
            <button type="submit" className="btn btn-primary hero-submit touch-target">
              Analyze
            </button>
          </form>

          <div className="hero-manual">
            <Link href="/staging?mode=manual" className="hero-manual-link touch-target">
              <span className="manual-icon">✍️</span>
              <span>Write manually</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="home-grid">
        {highlights.map((card) => (
          <div key={card.title} className="home-card mobile-card-inline">
            <span className="icon-badge">{card.icon}</span>
            <div className="card-body">
              <h2>{card.title}</h2>
              {/* Desktop: full description */}
              <p className="text-muted card-desc mobile-hide">{card.desc}</p>
              {/* Mobile: short description */}
              <p className="text-muted card-desc mobile-show mobile-show-block">{card.mobileDesc}</p>
            </div>
            <div className="home-card-actions">
              {card.actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`btn ${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'} touch-target`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <KitchenWisdom />
      </section>
    </div>
  );
}
