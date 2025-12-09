import Link from 'next/link';
import KitchenWisdom from '@/components/KitchenWisdom';

const highlights = [
  {
    icon: '📅',
    title: 'Events',
    desc: 'Create cooking sessions with headcount and target mass. Build menus and scale recipes automatically.',
    actions: [
      { label: 'View All', href: '/events', variant: 'secondary' },
      { label: 'New Event', href: '/events/new', variant: 'primary' },
    ],
  },
  {
    icon: '📖',
    title: 'Recipe Library',
    desc: 'Browse and manage your collection of recipes. All quantities stored in metric for consistent scaling.',
    actions: [
      { label: 'Browse', href: '/recipes', variant: 'secondary' },
      { label: 'Ingest New', href: '/staging', variant: 'primary' },
    ],
  },
];

export default function Home() {
  return (
    <div className="home">
      <section className="home-hero">
        <div className="hero-shell mobile-px-sm">

          <h1 className="hero-title mobile-heading-sm" style={{ textAlign: 'center' }}>What are we cooking today?</h1>
          <p className="hero-subtitle mobile-text-sm" style={{ textAlign: 'center' }}>
            Scale recipes, build menus, and feed the crowd.
          </p>

          <form action="/staging" method="GET" className="hero-search mobile-stack mobile-gap-sm">
            <input
              type="text"
              name="q"
              placeholder="Paste recipe URL or text..."
              className="input-field hero-input mobile-full-width"
              autoFocus
            />
            <button type="submit" className="btn btn-primary hero-submit mobile-full-width touch-target">
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

      <section className="home-grid mobile-cols-1 mobile-gap-md mobile-px-sm">
        {highlights.map((card) => (
          <div key={card.title} className="home-card mobile-card-compact">
            <div className="home-card-top mobile-stack mobile-gap-sm">
              <span className="icon-badge">{card.icon}</span>
              <div>
                <h2 className="mobile-heading-sm">{card.title}</h2>
                <p className="text-muted mobile-text-sm">{card.desc}</p>
              </div>
            </div>
            <div className="home-card-actions mobile-stack mobile-gap-sm">
              {card.actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`btn ${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'} w-full touch-target`}
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
