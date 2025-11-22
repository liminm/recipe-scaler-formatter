import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <header className="mb-6">
        <h1>Food Processor</h1>
        <p className="text-muted" style={{ fontSize: '1.125rem', maxWidth: '600px' }}>
          Logistics, scaling, and physics for social cooking events.
        </p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Events Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 'auto' }}>
            <h2 className="mb-2">Events</h2>
            <p className="text-muted mb-4">
              Manage upcoming cooking sessions, headcounts, and menus.
            </p>
          </div>
          <div className="mt-4" style={{ display: 'flex', gap: '1rem' }}>
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
            <h2 className="mb-2">Recipe Library</h2>
            <p className="text-muted mb-4">
              Global shared library of scaled, metric-converted recipes.
            </p>
          </div>
          <div className="mt-4" style={{ display: 'flex', gap: '1rem' }}>
             <Link href="/recipes" className="btn btn-secondary w-full">
              Browse
            </Link>
            <Link href="/staging" className="btn btn-primary w-full">
              Ingest New
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
