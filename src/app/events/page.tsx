import Link from 'next/link';

export default function EventsPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Events</h1>
          <p className="text-muted">
            Manage cooking sessions and menus
          </p>
        </div>
        <Link href="/events/new" className="btn btn-primary">
          + New Event
        </Link>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 className="mb-4">Coming Soon</h2>
        <p className="text-muted mb-6">
          Event management features are currently under development.
        </p>
        <Link href="/" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
