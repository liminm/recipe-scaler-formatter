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
  {
    icon: '✨',
    title: 'AI Ingestion',
    desc: 'Extract recipes from URLs or text using AI. Automatically parse ingredients and steps.',
    tags: ['URL Scraping', 'AI Parsing'],
    actions: [{ label: 'Start Ingestion', href: '/staging', variant: 'primary' }],
  },
];

export default function Home() {
  return (
    <div className="dashboard">
      <section className="dash-hero">
        <div>
          <p className="eyebrow">Operator view</p>
          <h1 className="dash-title">Dashboard</h1>
          <p className="text-muted dash-subtitle">
            A production engine for scaling recipes to feed large groups. Manage events, build menus, and handle
            constraints like equipment limits and dietary requirements.
          </p>
          <div className="dash-actions">
            <Link href="/staging" className="btn btn-primary">
              Ingest a Recipe
            </Link>
            <Link href="/events" className="btn btn-secondary">
              View Events
            </Link>
          </div>
        </div>
        <div className="dash-highlight">
          <div>
            <p className="text-muted" style={{ marginBottom: '0.25rem' }}>
              Confidence
            </p>
            <div className="pill pill-strong">99.9% ingredient coverage</div>
          </div>
          <div>
            <p className="text-muted" style={{ marginBottom: '0.25rem' }}>
              Latest ingest
            </p>
            <div className="pill">Just now</div>
          </div>
          <div>
            <p className="text-muted" style={{ marginBottom: '0.25rem' }}>
              System status
            </p>
            <div className="pill pill-success">Online</div>
          </div>
        </div>
      </section>

      <section className="dash-grid">
        {highlights.map((card) => (
          <div key={card.title} className="dash-card">
            <div>
              <div className="dash-card-head">
                <span className="dash-icon">{card.icon}</span>
                <h2>{card.title}</h2>
              </div>
              <p className="text-muted">{card.desc}</p>
              <div className="dash-tags">
                {card.tags.map((tag) => (
                  <span key={tag} className="chip chip-soft">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="dash-actions-row">
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
