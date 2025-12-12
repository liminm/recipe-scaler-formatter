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
      {/* ========== MOBILE iOS LAYOUT ========== */}
      <div className="ios-home mobile-show">
        {/* Hero Section */}
        <section className="ios-home-hero">
          <h1 className="ios-home-title">What's for dinner?</h1>
          
          <form action="/staging" method="GET" className="ios-home-form">
            <input
              type="text"
              name="q"
              placeholder="🔗 Paste a recipe URL..."
              className="ios-home-input"
            />
            <button type="submit" className="ios-home-submit">
              Analyze Recipe
            </button>
          </form>
          
          <Link href="/staging?mode=manual" className="ios-home-secondary">
            📝 Or write manually
          </Link>
        </section>

        {/* Library Section */}
        <div className="ios-section-header">Library</div>
        <div className="ios-grouped-list ios-home-list">
          <Link href="/recipes" className="ios-list-cell">
            <span className="cell-icon">📖</span>
            <span className="cell-label">Recipes</span>
            <span className="chevron">›</span>
          </Link>
          <Link href="/events" className="ios-list-cell last">
            <span className="cell-icon">📅</span>
            <span className="cell-label">Events</span>
            <span className="chevron">›</span>
          </Link>
        </div>

        {/* Compact Kitchen Wisdom */}
        <div className="ios-kitchen-wisdom">
          <KitchenWisdom />
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT (preserved) ========== */}
      <section className="home-hero mobile-hide">
        <div className="hero-shell">
          <h1 className="hero-title">What are we cooking today?</h1>
          <p className="hero-subtitle">
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

      <section className="home-grid mobile-hide">
        {highlights.map((card) => (
          <div key={card.title} className="home-card">
            <span className="icon-badge">{card.icon}</span>
            <div className="card-body">
              <h2>{card.title}</h2>
              <p className="text-muted card-desc">{card.desc}</p>
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
