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
      <section className="dash-hero" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <p className="eyebrow" style={{ justifyContent: 'center' }}>Operator view</p>
          <h1 className="dash-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>What are we cooking?</h1>
          <p className="text-muted dash-subtitle" style={{ marginBottom: '2rem' }}>
            Scale recipes, build menus, and feed the crowd.
          </p>
          
          {/* Quick Ingest Form */}
          <form 
            action="/staging" 
            method="GET"
            className="card"
            style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <input 
              type="text" 
              name="q" 
              placeholder="Paste recipe URL or text..." 
              className="input-field"
              style={{ flex: 1, border: 'none', fontSize: '1.1rem', padding: '0.75rem' }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>
              Analyze
            </button>
          </form>

          <div className="dash-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link href="/events" className="btn btn-secondary">
              View Events
            </Link>
            <Link href="/recipes" className="btn btn-secondary">
              Browse Library
            </Link>
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
