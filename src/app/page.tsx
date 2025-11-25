import Link from 'next/link';

const highlights = [
  {
    icon: '📅',
    title: 'Events',
    desc: 'Create cooking sessions with headcount and target mass. Build menus and scale recipes automatically.',
    tags: ['Menu Builder', 'Auto Scaling'],
    actions: [
      { label: 'View All', href: '/events', variant: 'secondary' },
      { label: 'New Event', href: '/events/new', variant: 'primary' },
    ],
  },
  {
    icon: '📖',
    title: 'Recipe Library',
    desc: 'Browse and manage your collection of recipes. All quantities stored in metric for consistent scaling.',
    tags: ['Metric Only', 'Shared Library'],
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
        <div className="hero-shell">
          <div className="eyebrow" style={{ justifyContent: 'center' }}>Operator cockpit</div>
          <h1 className="hero-title" style={{ textAlign: 'center' }}>What are we cooking today?</h1>
          <p className="hero-subtitle" style={{ textAlign: 'center' }}>
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
            <button type="submit" className="btn btn-primary hero-submit">
              Analyze
            </button>
          </form>
        </div>
      </section>

      <section className="home-grid">
        {highlights.map((card) => (
          <div key={card.title} className="home-card">
            <div className="home-card-top">
              <span className="icon-badge">{card.icon}</span>
              <div>
                <h2>{card.title}</h2>
                <p className="text-muted">{card.desc}</p>
              </div>
            </div>
            <div className="home-card-tags">
              {card.tags.map((tag) => (
                <span key={tag} className="chip chip-soft">
                  {tag}
                </span>
              ))}
            </div>
            <div className="home-card-actions">
              {card.actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`btn ${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'} w-full`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
