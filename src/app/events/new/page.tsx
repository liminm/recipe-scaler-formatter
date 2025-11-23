'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EventHeader from '@/components/events/EventHeader';

export default function CreateEventPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState('New Event');
  const [headcount, setHeadcount] = useState(30);
  const [targetMass, setTargetMass] = useState(500);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventName,
          headcount,
          target_mass: targetMass,
          tags: dietaryTags
        }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      router.push(`/events/${data.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create event');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="mb-6">Create New Event</h1>
      <EventHeader
        eventName={eventName}
        headcount={headcount}
        targetMass={targetMass}
        dietaryTags={dietaryTags}
        onEventNameChange={setEventName}
        onHeadcountChange={setHeadcount}
        onTargetMassChange={setTargetMass}
        onRemoveTag={(tag) => setDietaryTags(prev => prev.filter(t => t !== tag))}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
