'use client';

import { useState, useEffect } from 'react';
import { AIProvider } from '@/lib/ai/types';
import styles from './ModelSettings.module.css';

export default function ModelSettings() {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Read initial value from cookie
    const match = document.cookie.match(new RegExp('(^| )ai_provider=([^;]+)'));
    if (match) {
      setProvider(match[2] as AIProvider);
    }
  }, []);

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    // Set cookie for 1 year
    document.cookie = `ai_provider=${newProvider}; path=/; max-age=31536000`;
    // Refresh to apply changes
    window.location.reload();
  };

  return (
    <div className={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.toggleButton}
        title="AI Model Settings"
      >
        🤖
      </button>

      {isOpen && (
        <div className={styles.popup}>
          <h3 className={styles.title}>AI Provider</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className={styles.option}>
              <input
                type="radio"
                name="provider"
                value="gemini"
                checked={provider === 'gemini'}
                onChange={() => handleProviderChange('gemini')}
              />
              <span>Google Gemini</span>
            </label>
            <label className={styles.option}>
              <input
                type="radio"
                name="provider"
                value="openrouter"
                checked={provider === 'openrouter'}
                onChange={() => handleProviderChange('openrouter')}
              />
              <span>OpenRouter</span>
            </label>
            <label className={styles.option}>
              <input
                type="radio"
                name="provider"
                value="iflow"
                checked={provider === 'iflow'}
                onChange={() => handleProviderChange('iflow')}
              />
              <span>iFlow</span>
            </label>
          </div>
          <div className={styles.note}>
            {provider === 'openrouter' && (
              <p>Requires OPENROUTER_API_KEY in .env</p>
            )}
            {provider === 'iflow' && (
              <p>Requires IFLOW_API_KEY in .env</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
