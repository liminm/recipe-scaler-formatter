'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface EventSummary {
  id: string;
  name: string;
  total_headcount: number;
  target_weight_per_person_g: number;
  created_at: string;
}

export default function EventsListPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events/list');
        const data = await res.json();
        if (data.events) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Failed to fetch events', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <div className="library-layout">
      <div className="library-hero" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)' }}>
        <div>
          <p className="eyebrow">Production Planning</p>
          <div className="hero-heading">
            <h1>Events</h1>
          </div>
          <p className="text-muted">
            Manage cooking sessions, build menus, and ensure you have enough food for everyone.
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/events/new" className="btn btn-primary">
            + New Event
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-center" style={{ padding: '4rem' }}>
          <p className="text-muted">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card empty-card">
          <div>
            <p className="eyebrow">No events</p>
            <h2 className="mb-4">Ready to cook?</h2>
            <p className="text-muted mb-4">Create your first event to start planning a menu.</p>
            <Link href="/events/new" className="btn btn-primary">
              Create Event
            </Link>
          </div>
        </div>
      ) : (
        <div className="recipe-grid mobile-cols-1">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} className="recipe-card">
              <div className="card-top">
                <span className="badge">{event.total_headcount} people</span>
                <span className="pill">{new Date(event.created_at).toLocaleDateString()}</span>
              </div>
              <h3 className="mb-2">{event.name}</h3>
              <p className="text-muted">
                Target: {((event.total_headcount * event.target_weight_per_person_g) / 1000).toFixed(1)} kg total
              </p>
              <div className="card-footer">
                <span className="text-primary meta">Manage Event ↗</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
