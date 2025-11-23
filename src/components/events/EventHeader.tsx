import { useState } from 'react';

interface EventHeaderProps {
  eventName: string;
  headcount: number;
  targetMass: number;
  dietaryTags: string[];
  onEventNameChange: (name: string) => void;
  onHeadcountChange: (count: number) => void;
  onTargetMassChange: (mass: number) => void;
  onRemoveTag: (tag: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function EventHeader({ 
  eventName, 
  headcount, 
  targetMass, 
  dietaryTags,
  onEventNameChange,
  onHeadcountChange,
  onTargetMassChange,
  onRemoveTag,
  onSave,
  isSaving
}: EventHeaderProps) {
  const [showEquipment, setShowEquipment] = useState(false);

  return (
    <div className="card mb-6">
      <input
        type="text"
        value={eventName}
        onChange={(e) => onEventNameChange(e.target.value)}
        className="input-field mb-4"
        style={{ fontSize: '1.75rem', fontWeight: 700, background: 'transparent', border: 'none', padding: '0.5rem 0' }}
        placeholder="Event Name"
      />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
            Headcount
          </label>
          <input
            type="number"
            value={headcount}
            onChange={(e) => onHeadcountChange(Number(e.target.value))}
            className="input-field"
            min="1"
          />
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Serving {headcount} people
          </p>
        </div>
        
        <div>
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
            Target Weight Per Person
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="number"
              value={targetMass}
              onChange={(e) => onTargetMassChange(Number(e.target.value))}
              className="input-field"
              min="100"
              step="50"
            />
            <span className="text-muted">g</span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Total target: {((headcount * targetMass) / 1000).toFixed(1)} kg
          </p>
        </div>
      </div>
      
      {dietaryTags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {dietaryTags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.75rem',
                background: 'rgba(79, 70, 229, 0.15)',
                color: '#6366f1',
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '1rem' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setShowEquipment(!showEquipment)}
          className="btn btn-secondary"
          style={{ fontSize: '0.875rem' }}
        >
          {showEquipment ? '− Hide' : '+ Show'} Equipment Profile
        </button>
      </div>

      {showEquipment && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="text-muted" style={{ fontSize: '0.75rem' }}>Oven Capacity</label>
              <p className="text-mono">4 trays</p>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.75rem' }}>Fridge Space</label>
              <p className="text-mono">200L</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          className="btn btn-primary" 
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Event'}
        </button>
        <button className="btn btn-secondary">Duplicate Event</button>
      </div>
    </div>
  );
}
