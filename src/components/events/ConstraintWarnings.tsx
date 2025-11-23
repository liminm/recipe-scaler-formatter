interface Warning {
  type: 'crowding' | 'temperature' | 'deficit';
  message: string;
}

export default function ConstraintWarnings({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;
  
  return (
    <div className="card mb-6">
      <h3 className="mb-4">Warnings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {warnings.map((warning, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'start',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <span style={{ fontSize: '1.25rem', color: '#f59e0b' }}>⚠</span>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', flex: 1 }}>
              {warning.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
