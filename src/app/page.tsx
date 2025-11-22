import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <header className="mb-6">
        <h1 style={{ marginBottom: '1rem' }}>Dashboard</h1>
        <p className="text-muted" style={{ fontSize: '1.125rem', maxWidth: '640px', lineHeight: 1.6 }}>
          A production engine for scaling recipes to feed large groups. Manage events, build menus, and handle constraints like equipment limits and dietary requirements.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        
        {/* Events Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📅</span>
              <h2 style={{ margin: 0 }}>Events</h2>
            </div>
            <p className="text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
              Create cooking sessions with headcount and target mass. Build menus and scale recipes automatically.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(79, 70, 229, 0.15)', color: '#6366f1', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                Menu Builder
              </span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(79, 70, 229, 0.15)', color: '#6366f1', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                Auto Scaling
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Link href="/events" className="btn btn-secondary w-full">
              View All
            </Link>
            <Link href="/events/new" className="btn btn-primary w-full">
              New Event
            </Link>
          </div>
        </div>

        {/* Recipes Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📖</span>
              <h2 style={{ margin: 0 }}>Recipe Library</h2>
            </div>
            <p className="text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
              Browse and manage your collection of recipes. All quantities stored in metric for consistent scaling.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                Metric Only
              </span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                Shared Library
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Link href="/recipes" className="btn btn-secondary w-full">
              Browse
            </Link>
            <Link href="/staging" className="btn btn-primary w-full">
              Ingest New
            </Link>
          </div>
        </div>

        {/* Ingestion Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✨</span>
              <h2 style={{ margin: 0 }}>AI Ingestion</h2>
            </div>
            <p className="text-muted" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
              Extract recipes from URLs or text using AI. Automatically parse ingredients and steps.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                URL Scraping
              </span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                AI Parsing
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Link href="/staging" className="btn btn-primary w-full">
              Start Ingestion
            </Link>
          </div>
        </div>

      </div>

      {/* Quick Stats Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 className="mb-4">Quick Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Recipes</p>
            <p className="text-mono" style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>—</p>
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Active Events</p>
            <p className="text-mono" style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>—</p>
          </div>
          <div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Servings Planned</p>
            <p className="text-mono" style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>—</p>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div>
        <h3 className="mb-4">Core Features</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', fontWeight: 600 }}>Constraint Handling</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
              Automatic warnings for oven crowding, temperature shock, and equipment limits.
            </p>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', fontWeight: 600 }}>Dietary Compliance</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
              Track allergens and dietary requirements across all recipes in your menu.
            </p>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', fontWeight: 600 }}>Production Ready</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
              Generate cook-facing instructions with scaled quantities and timing notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
