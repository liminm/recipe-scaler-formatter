'use client';

interface LoadingDumplingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function LoadingDumpling({ message, size = 'medium' }: LoadingDumplingProps) {
  const sizeMap = {
    small: '48px',
    medium: '80px',
    large: '120px'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      padding: '2rem'
    }}>
      <div className="bouncing-dumpling">
        <img 
          src="/dumpling-logo.png" 
          alt="Loading..." 
          style={{ 
            width: sizeMap[size], 
            height: sizeMap[size],
            display: 'block'
          }} 
        />
      </div>
      
      {message && (
        <p className="text-muted" style={{ 
          fontSize: '0.9375rem',
          textAlign: 'center',
          maxWidth: '300px',
          animation: 'fade-pulse 2s ease-in-out infinite'
        }}>
          {message}
        </p>
      )}

      <style jsx>{`
        @keyframes squash-bounce {
          0% {
            transform: translateY(0) scaleY(1) scaleX(1);
          }
          10% {
            transform: translateY(-5px) scaleY(1.05) scaleX(0.95);
          }
          30% {
            transform: translateY(-20px) scaleY(1.1) scaleX(0.9);
          }
          50% {
            transform: translateY(-25px) scaleY(1.15) scaleX(0.85);
          }
          57% {
            transform: translateY(-20px) scaleY(1.1) scaleX(0.9);
          }
          64% {
            transform: translateY(0) scaleY(0.9) scaleX(1.1);
          }
          75% {
            transform: translateY(0) scaleY(0.95) scaleX(1.05);
          }
          88% {
            transform: translateY(0) scaleY(1.02) scaleX(0.98);
          }
          100% {
            transform: translateY(0) scaleY(1) scaleX(1);
          }
        }

        @keyframes fade-pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .bouncing-dumpling {
          animation: squash-bounce 1.2s ease-in-out infinite;
          transform-origin: center bottom;
        }
      `}</style>
    </div>
  );
}
