'use client';

import { useState, useEffect } from 'react';
import { useChili } from '@/context/ChiliContext';
import { DUMPLING_JOKES } from '@/data/dumplingJokes';
import { CHILI_JOKES } from '@/data/chiliJokes';

import { getNextJoke } from '@/services/jokes';

export default function KitchenWisdom() {
  const { isChiliMode } = useChili();
  const [hoverMessage, setHoverMessage] = useState('');
  const [idleMessage, setIdleMessage] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [joke, setJoke] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Determine mascot image
  let mascotImage = isChiliMode ? '/chili.png' : '/dumpling-logo.png';
  
  if (!isChiliMode) {
    if (joke) {
      mascotImage = '/dumpling-laugh.png';
    } else if (isHovered) {
      mascotImage = '/dumpling-wink.png';
    }
  }

  const idleMessages = [
    'I have secrets... 🤫',
    'I know things... 👀',
    'Psst... over here! 🗣️',
    'I have stories! 📖',
    'Want some knowledge? 🎓',
    'I\'ve got jokes! 🎭',
    'Need a break? ☕',
    'Cooking something? 🍳',
    'Penny for your thoughts? 🪙',
    'I\'m full of wisdom! 🥟'
  ];

  const chiliIdleMessages = [
    'I\'m burning up! 🔥',
    'Too hot to handle? 🌶️',
    'Spicy secrets here... 🤫',
    'Feeling the heat? 🌡️',
    'I\'ve got fire jokes! 🎭',
    'Need some spice? 🧂',
    'Cooking with fire! 🍳',
    'Hot stuff coming through! 💨',
    'Ready for the burn? ❤️‍🔥',
    'I\'m on fire! 🚒'
  ];

  const hoverMessages = [
    'Click me! 👆',
    'Tap for wisdom! 🧠',
    'Press me! ✨',
    'Crack me open! 🥠',
    'Tap to reveal! 🎁',
    'Click for a joke! 😄',
    'Press for fun! 🎉',
    'Give me a tap! 👈',
    'Click here! 🎯',
    'Tap for a surprise! 🎈'
  ];

  const chiliHoverMessages = [
    'Click for heat! 🔥',
    'Tap for spice! 🌶️',
    'Press for fire! 🧨',
    'Ignite me! 💥',
    'Tap to burn! ❤️‍🔥',
    'Click for a hot take! 🗣️',
    'Press for sizzle! 🥓',
    'Give me a spark! ⚡',
    'Click to explode! 💣',
    'Tap for a scorcher! ☀️'
  ];

  // Cycle idle messages
  useEffect(() => {
    const messages = isChiliMode ? chiliIdleMessages : idleMessages;
    setIdleMessage(messages[Math.floor(Math.random() * messages.length)]);

    const interval = setInterval(() => {
      const currentMessages = isChiliMode ? chiliIdleMessages : idleMessages;
      setIdleMessage(currentMessages[Math.floor(Math.random() * currentMessages.length)]);
    }, 5000);

    return () => clearInterval(interval);
  }, [isChiliMode]);

  const handleCrackOpen = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setJoke(null);

    // Play animation for a bit, then show joke
    setTimeout(() => {
      const pool = isChiliMode ? CHILI_JOKES : DUMPLING_JOKES;
      const randomJoke = getNextJoke(pool);
      setJoke(randomJoke);
      setIsAnimating(false);
    }, 800);
  };

  return (
    <div className="home-card kitchen-wisdom-card">
      <div className="home-card-top">
        <span className="icon-badge">{isChiliMode ? '🌶️' : '🥠'}</span>
        <div>
          <h2>{isChiliMode ? "Spicy Secrets" : "Kitchen Wisdom"}</h2>
          <p className="text-muted">
            {joke 
              ? (isChiliMode ? "Hot off the grill!" : "Fresh from the steamer!") 
              : (isChiliMode ? "Need some heat? Crack open a joke." : "Need a break? Crack open a joke.")}
          </p>
        </div>
      </div>

      <div className="wisdom-body" style={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1.5rem 0',
        minHeight: '200px'
      }}>
        <div 
          className={`wisdom-mascot ${isAnimating ? 'anim-shake' : ''}`}
          onClick={handleCrackOpen}
          onMouseEnter={() => {
            setIsHovered(true);
            const messages = isChiliMode ? chiliHoverMessages : hoverMessages;
            setHoverMessage(messages[Math.floor(Math.random() * messages.length)]);
          }}
          onMouseLeave={() => setIsHovered(false)}
          style={{ margin: '0 auto', width: '80px', height: '80px', position: 'relative' }}
        >
          <img 
            src={mascotImage} 
            alt="Mascot" 
            width={80}
            height={80}
            className={isAnimating ? 'blur-sm' : ''}
          />
          
          {/* Unified Bubble */}
          {!joke && !isAnimating && (
            <div className="hover-bubble fade-in">
              {isHovered ? hoverMessage : idleMessage}
            </div>
          )}
        </div>

        {joke && (
          <div className="wisdom-content fade-in">
            <p>"{joke}"</p>
          </div>
        )}
      </div>

      <div className="home-card-actions">
        <button 
          onClick={handleCrackOpen}
          className={`btn ${isChiliMode ? 'btn-primary' : 'btn-secondary'} w-full`}
          disabled={isAnimating}
        >
          {isAnimating 
            ? (isChiliMode ? 'Sizzling...' : 'Cooking...') 
            : (joke 
                ? (isChiliMode ? 'More Heat' : 'Crack Another') 
                : (isChiliMode ? 'Add Spice' : 'Crack Open'))}
        </button>
      </div>

      <style jsx>{`
        .kitchen-wisdom-card {
          display: flex;
          flex-direction: column;
        }
        
        .wisdom-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 0;
          min-height: 200px;
          gap: 1rem;
          width: 100%;
          text-align: center;
        }

        .wisdom-mascot {
          width: 80px;
          height: 80px;
          position: relative;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          transform: translateZ(0);
        }

        .wisdom-mascot:hover {
          transform: scale(1.1) rotate(5deg);
        }

        .wisdom-mascot img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .hover-bubble {
          position: absolute;
          top: -25px;
          right: -30px;
          background: var(--color-primary);
          color: white;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: bold;
          white-space: nowrap;
          z-index: 10;
          pointer-events: none;
          animation: bounce 2s infinite;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transform: rotate(-5deg);
        }

        .wisdom-content {
          text-align: center;
          background: var(--color-surface-hover);
          padding: 1rem;
          border-radius: 1rem;
          border: 1px dashed var(--color-border);
          width: 100%;
        }

        .wisdom-content p {
          margin: 0;
          font-style: italic;
          color: var(--color-text);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .anim-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-5px) rotate(-5deg); }
        }

        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
