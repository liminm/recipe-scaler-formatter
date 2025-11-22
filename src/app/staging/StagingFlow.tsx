'use client';

import { useState } from 'react';
import { RecipeCandidate } from '@/services/ingestion/splitter';
import { StagingRecipe } from '@/types/staging';

export default function StagingFlow() {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<RecipeCandidate[]>([]);
  const [step, setStep] = useState<'input' | 'selection' | 'editor'>('input');
  const [stagingRecipe, setStagingRecipe] = useState<StagingRecipe | null>(null);
  
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let textToSplit = inputValue;
      
      if (inputMode === 'url') {
        const res = await fetch('/api/ingest/scrape', {
          method: 'POST',
          body: JSON.stringify({ url: inputValue }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        textToSplit = data.rawText;
      }
      
      const res = await fetch('/api/ingest/split', {
        method: 'POST',
        body: JSON.stringify({ text: textToSplit }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setCandidates(data.candidates);
      setStep('selection');
      
    } catch (error) {
      console.error(error);
      alert('Failed to process input');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectCandidate = async (candidate: RecipeCandidate) => {
    setIsLoading(true);
    try {
      // Call Extractor
      const res = await fetch('/api/ingest/extract', {
        method: 'POST',
        body: JSON.stringify({ 
          text: inputValue, // Ideally we'd pass the specific snippet or the whole text + index
          titleHint: candidate.title 
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setStagingRecipe(data.recipe);
      setStep('editor');
    } catch (error) {
      console.error(error);
      alert('Failed to extract recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!stagingRecipe) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/recipes/create', {
        method: 'POST',
        body: JSON.stringify({ stagingRecipe }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      alert('Recipe saved successfully!');
      // Reset or redirect
      setStep('input');
      setInputValue('');
      setStagingRecipe(null);
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save recipe: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {step === 'input' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1rem' }}>Ingest Recipe</h2>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button 
              className={`btn ${inputMode === 'url' ? 'btn-primary' : ''}`}
              onClick={() => setInputMode('url')}
              style={{ flex: 1 }}
            >
              From URL
            </button>
            <button 
              className={`btn ${inputMode === 'text' ? 'btn-primary' : ''}`}
              onClick={() => setInputMode('text')}
              style={{ flex: 1 }}
            >
              Paste Text
            </button>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            {inputMode === 'url' ? (
              <input
                type="url"
                placeholder="https://example.com/recipe"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="input-field"
              />
            ) : (
              <textarea
                placeholder="Paste recipe text here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                rows={10}
                className="input-field"
              />
            )}
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={isLoading || !inputValue}
          >
            {isLoading ? 'Processing...' : 'Analyze'}
          </button>
        </div>
      )}
      
      {step === 'selection' && (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Select Recipe</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
            We found {candidates.length} potential recipe(s). Choose one to import.
          </p>
          
          <div className="grid">
            {candidates.map((c) => (
              <div key={c.index} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="mb-4">{c.title}</h3>
                <p className="text-muted mb-4" style={{ flex: 1 }}>{c.summary}</p>
                <div className="text-mono text-muted mb-4" style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>
                  "{c.originalTextSnippet}..."
                </div>
                <button 
                  className="btn btn-primary w-full"
                  onClick={() => handleSelectCandidate(c)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Extracting...' : 'Import This'}
                </button>
              </div>
            ))}
          </div>
          
          <button 
            className="btn" 
            style={{ marginTop: '2rem' }}
            onClick={() => setStep('input')}
          >
            Back
          </button>
        </div>
      )}
      

      {step === 'editor' && stagingRecipe && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: '80vh' }}>
          {/* Left: Raw Text */}
          <div className="card" style={{ overflowY: 'auto' }}>
            <h3 className="text-muted mb-4">Source Text</h3>
            <pre className="text-mono text-muted" style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
              {stagingRecipe.raw_text || inputValue}
            </pre>
          </div>
          
          {/* Right: Editor Form */}
          <div className="card" style={{ overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>{stagingRecipe.title}</h2>
              <button 
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Approve & Save'}
              </button>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3>Ingredients</h3>
              <table className="w-full" style={{ borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                    <th className="text-muted" style={{ padding: '0.5rem' }}>Name</th>
                    <th className="text-muted" style={{ padding: '0.5rem' }}>Qty (g)</th>
                    <th className="text-muted" style={{ padding: '0.5rem' }}>State</th>
                    <th className="text-muted" style={{ padding: '0.5rem' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {stagingRecipe.ingredients.map((ing) => (
                    <tr key={ing.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="text-mono" style={{ padding: '0.5rem' }}>{ing.name_normalized}</td>
                      <td className="text-mono" style={{ padding: '0.5rem' }}>{ing.base_quantity_g || '-'}</td>
                      <td style={{ padding: '0.5rem' }}>{ing.state || '?'}</td>
                      <td style={{ padding: '0.5rem' }}>{ing.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div>
              <h3>Steps</h3>
              <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                {stagingRecipe.steps.map((step) => (
                  <li key={step.id} style={{ marginBottom: '0.5rem' }}>
                    {step.instruction_raw}
                    {step.constraint_tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        {step.constraint_tags.map(tag => (
                          <span key={tag} style={{ fontSize: '0.75rem', background: 'var(--color-warning)', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
