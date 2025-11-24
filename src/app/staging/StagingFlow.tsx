'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecipeCandidate } from '@/services/ingestion/splitter';
import { StagingRecipe, StagingIngredient, StagingStep } from '@/types/staging';
import LoadingDumpling from '@/components/LoadingDumpling';
import { estimateYield } from '@/services/ingestion/yieldCalculator';
import { useChili } from '@/context/ChiliContext';
import RecipeEditor from '@/components/RecipeEditor';

interface BatchItem {
  candidate: RecipeCandidate;
  status: 'pending' | 'loading' | 'ready' | 'saving' | 'saved' | 'error';
  recipe: StagingRecipe | null;
  error?: string;
}

export default function StagingFlow() {
  const router = useRouter();
  const { isChiliMode } = useChili();
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [candidates, setCandidates] = useState<RecipeCandidate[]>([]);
  const [step, setStep] = useState<'input' | 'selection' | 'editor'>('input');
  const [stagingRecipe, setStagingRecipe] = useState<StagingRecipe | null>(null);
  


  // Source text visibility toggle
  const [isSourceTextVisible, setIsSourceTextVisible] = useState(true);


  
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
  
  // Multi-import state
  const [selectedCandidateIndices, setSelectedCandidateIndices] = useState<Set<number>>(new Set());
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(-1);

  // Helper to fetch a recipe (used for both immediate and prefetch)
  const fetchRecipe = async (candidate: RecipeCandidate): Promise<StagingRecipe> => {
    const res = await fetch('/api/ingest/extract', {
      method: 'POST',
      body: JSON.stringify({ 
        text: inputValue, 
        titleHint: candidate.title,
        summary: candidate.summary
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.recipe;
  };

  // Trigger background prefetch for the next pending item
  const triggerPrefetch = (items: BatchItem[], currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) return;
    
    const nextItem = items[nextIndex];
    if (nextItem.status !== 'pending') return;

    console.log(`Starting background prefetch for: ${nextItem.candidate.title}`);
    
    // Optimistically mark as loading to prevent double fetch
    // Note: In a real app we might want a separate 'prefetching' state or just be careful
    // For now, we'll just fire the request and update when done.
    // We won't update state to 'loading' here to avoid UI flicker if the user switches to it.
    // Actually, let's just let the user switch and trigger load if needed.
    // But to be efficient, we can fire the promise and store it?
    // For simplicity in this refactor, let's just do a fire-and-forget update:
    
    fetchRecipe(nextItem.candidate)
      .then(recipe => {
        console.log(`Prefetch complete for: ${nextItem.candidate.title}`);
        setBatchItems(prev => prev.map((item, idx) => 
          idx === nextIndex ? { ...item, status: 'ready', recipe } : item
        ));
      })
      .catch(err => console.error('Prefetch failed:', err));
  };

  const loadBatchItem = async (index: number) => {
    if (index < 0 || index >= batchItems.length) return;
    
    // Save current work if we are switching FROM a valid recipe
    if (activeBatchIndex !== -1 && activeBatchIndex !== index && stagingRecipe) {
       setBatchItems(prev => prev.map((item, idx) => 
         idx === activeBatchIndex ? { ...item, recipe: stagingRecipe } : item
       ));
    }

    setActiveBatchIndex(index);
    const item = batchItems[index];

    if (item.status === 'ready' && item.recipe) {
      setStagingRecipe(item.recipe);
      setStep('editor');
    } else if (item.status === 'pending' || item.status === 'error') {
      setIsLoading(true);
      setLoadingMessage(`Extracting ${item.candidate.title}...`);
      
      // Update status to loading
      setBatchItems(prev => prev.map((it, idx) => 
        idx === index ? { ...it, status: 'loading' } : it
      ));

      try {
        const recipe = await fetchRecipe(item.candidate);
        setBatchItems(prev => prev.map((it, idx) => 
          idx === index ? { ...it, status: 'ready', recipe } : it
        ));
        setStagingRecipe(recipe);
        setStep('editor');
        
        // Trigger prefetch for next
        triggerPrefetch(batchItems, index);
        
      } catch (error: any) {
        console.error(error);
        setBatchItems(prev => prev.map((it, idx) => 
          idx === index ? { ...it, status: 'error', error: error.message } : it
        ));
        alert(`Failed to load recipe: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    } else if (item.status === 'saved' && item.recipe) {
       setStagingRecipe(item.recipe);
       setStep('editor');
    }
  };

  const handleBatchImport = async () => {
    const selected = candidates.filter(c => selectedCandidateIndices.has(c.index));
    if (selected.length === 0) return;

    const newBatchItems: BatchItem[] = selected.map(c => ({
      candidate: c,
      status: 'pending',
      recipe: null
    }));

    setBatchItems(newBatchItems);
    
    // Load the first one
    // We need to set the state first, then trigger load. 
    // Since setState is async, we can't call loadBatchItem immediately with the new state.
    // But we can manually do the first load logic here or use an effect.
    // Let's do it manually to ensure smooth transition.
    
    setIsLoading(true);
    setLoadingMessage(`Extracting ${selected[0].title}...`);
    
    try {
      // Optimistically set the batch items
      // We'll update the first one's status to loading in the state update below if we wanted,
      // but let's just fetch first.
      
      const firstRecipe = await fetchRecipe(selected[0]);
      
      newBatchItems[0].status = 'ready';
      newBatchItems[0].recipe = firstRecipe;
      
      setBatchItems(newBatchItems);
      setActiveBatchIndex(0);
      setStagingRecipe(firstRecipe);
      setStep('editor');
      
      // Trigger prefetch for next
      if (newBatchItems.length > 1) {
         triggerPrefetch(newBatchItems, 0);
      }
      
    } catch (error: any) {
       console.error(error);
       alert('Failed to start batch import');
       setBatchItems(newBatchItems); // Still set them so user can try again?
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockSplit = () => {
    const mockText = `
Recipe 1: Tacos
Take some beef...

Recipe 2: Salsa
Tomatoes and chilies...

Recipe 3: Guacamole
Mash avocados...
    `;
    setInputValue(mockText);
    
    const mockCandidates: RecipeCandidate[] = [
      { index: 0, title: "Mock Recipe 1: Tacos", summary: "Delicious beef tacos", originalTextSnippet: "Take some beef..." },
      { index: 1, title: "Mock Recipe 2: Salsa", summary: "Spicy red salsa", originalTextSnippet: "Tomatoes and chilies..." },
      { index: 2, title: "Mock Recipe 3: Guacamole", summary: "Creamy avocado dip", originalTextSnippet: "Mash avocados..." },
    ];
    setCandidates(mockCandidates);
    setStep('selection');
  };

  const handleSelectCandidate = async (candidate: RecipeCandidate) => {
    // Treat single selection as a batch of 1
    const newBatchItems: BatchItem[] = [{
      candidate,
      status: 'pending',
      recipe: null
    }];
    setBatchItems(newBatchItems);
    
    // Load it
    setIsLoading(true);
    setLoadingMessage(`Extracting ${candidate.title}...`);
    
    try {
      const recipe = await fetchRecipe(candidate);
      newBatchItems[0].status = 'ready';
      newBatchItems[0].recipe = recipe;
      
      setBatchItems(newBatchItems);
      setActiveBatchIndex(0);
      setStagingRecipe(recipe);
      setStep('editor');
    } catch (error: any) {
      console.error(error);
      alert('Failed to extract recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCandidateSelection = (index: number) => {
    const newSet = new Set(selectedCandidateIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedCandidateIndices(newSet);
  };

  const handleManualStart = () => {
    const blankRecipe: StagingRecipe = {
      id: crypto.randomUUID(),
      title: 'Untitled Recipe',
      ingredients: [],
      steps: [],
      chefs_notes: [],
      original_yield_servings: 4, // Default
    };

    const manualItem: BatchItem = {
      candidate: { 
        title: 'Manual Entry', 
        index: 0, 
        summary: 'Created manually',
        originalTextSnippet: '' 
      },
      status: 'ready',
      recipe: blankRecipe
    };

    setBatchItems([manualItem]);
    setActiveBatchIndex(0);
    setStagingRecipe(blankRecipe);
    setIsSourceTextVisible(false); // No source text for manual entry
    setStep('editor');
  };



  const handleApprove = async () => {
    if (!stagingRecipe) return;
    
    // Update status to saving
    setBatchItems(prev => prev.map((item, idx) => 
      idx === activeBatchIndex ? { ...item, status: 'saving' } : item
    ));
    
    // We don't set global isLoading here because we want to allow navigation/interaction
    // But we might want to disable the save button for this specific recipe.
    
    try {
      const res = await fetch('/api/recipes/create', {
        method: 'POST',
        body: JSON.stringify({ stagingRecipe }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Mark as saved
      setBatchItems(prev => prev.map((item, idx) => 
        idx === activeBatchIndex ? { ...item, status: 'saved' } : item
      ));
      
      // Auto-advance to next pending/ready item
      const nextIndex = activeBatchIndex + 1;
      if (nextIndex < batchItems.length) {
        // Switch to next
        loadBatchItem(nextIndex);
      } else {
        // All done?
        if (batchItems.length === 1) {
          // Single recipe: Redirect immediately
          router.push(`/recipes/${data.recipeId}`);
        } else {
          // Batch: Redirect to the last one (or maybe list?)
          // Let's redirect to the last one so they can see it
          router.push(`/recipes/${data.recipeId}`);
        }
      }
      
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save recipe: ${error.message}`);
      setBatchItems(prev => prev.map((item, idx) => 
        idx === activeBatchIndex ? { ...item, status: 'error', error: error.message } : item
      ));
    }
  };

  return (
    <div>
      {/* Confirmation Dialog */}


      {step === 'input' && (
        <div className="ingest-panel">
          <div className="ingest-card">
            {isLoading ? (
              <LoadingDumpling
                message={inputMode === 'url' ? 'Fetching recipe from URL...' : 'Processing recipe text...'}
                size="medium"
              />
            ) : (
              <>
                <div className="ingest-card-head">
                  <div>
                    <p className="eyebrow">Start ingestion</p>
                    <h2 style={{ marginBottom: 0 }}>Add a new recipe</h2>
                  </div>
                </div>

                <div className="ingest-tabs">
                  <button 
                    className={`chip ${inputMode === 'url' ? 'chip-active' : ''}`}
                    onClick={() => setInputMode('url')}
                  >
                    From URL
                  </button>
                  <button 
                    className={`chip ${inputMode === 'text' ? 'chip-active' : ''}`}
                    onClick={() => setInputMode('text')}
                  >
                    Paste Text
                  </button>
                  <button 
                    className="chip"
                    onClick={handleManualStart}
                  >
                    ✍️ Write Manually
                  </button>
                </div>

                <div>
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
                      style={{ fontFamily: 'var(--font-mono)', minHeight: '220px' }}
                    />
                  )}
                </div>

                <div className="ingest-actions">
                  <button
                    className="btn btn-primary w-full"
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                  >
                    Analyze
                  </button>
                  {isChiliMode && (
                    <button className="btn btn-secondary w-full" onClick={handleMockSplit} style={{ borderStyle: 'dashed' }}>
                      🔧 Debug: Mock Split (3 Recipes)
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="ingest-aside">
            <div className="ingest-aside-card">
              <p className="eyebrow">Tips</p>
              <ul>
                <li>Full ingredient lines work best; include quantities and units.</li>
                <li>If there are multiple recipes in one paste, we’ll offer a split.</li>
                <li>Links behind a login may fail—paste the text instead.</li>
              </ul>
            </div>
            <div className="ingest-aside-card">
              <p className="eyebrow">Output</p>
              <p className="text-muted">We’ll parse steps, ingredients, yields, and metadata, then let you edit before saving.</p>
            </div>
          </div>
        </div>
      )}
      
      {step === 'selection' && (
        <div>
          {isLoading ? (
            <LoadingDumpling 
              message={loadingMessage || "Extracting recipe details with AI... This may take 20-30 seconds."}
              size="large"
            />
          ) : (
            <>
              <h2 style={{ marginBottom: '1rem' }}>Select Recipe</h2>
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                We found {candidates.length} potential recipe(s). Choose one to import.
              </p>
              
              <div className="grid">
                {candidates.map((c) => {
                  const isSelected = selectedCandidateIndices.has(c.index);
                  return (
                    <div 
                      key={c.index} 
                      className="card" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleCandidateSelection(c.index)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <h3 className="mb-0">{c.title}</h3>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {}} // Handled by div click
                          style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                        />
                      </div>
                      <p className="text-muted mb-4" style={{ flex: 1 }}>{c.summary}</p>
                      <div className="text-mono text-muted mb-4" style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>
                        "{c.originalTextSnippet}..."
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  className="btn" 
                  onClick={() => setStep('input')}
                >
                  Back
                </button>
                
                <div style={{ flex: 1 }}></div>
                
                <button
                  className="btn btn-primary"
                  disabled={selectedCandidateIndices.size === 0}
                  onClick={handleBatchImport}
                  style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
                >
                  Import Selected ({selectedCandidateIndices.size})
                </button>
              </div>
              

            </>
          )}
        </div>
      )}
      

      {step === 'editor' && stagingRecipe && (
        <div
          className="ingest-editor-grid"
          style={{
            gridTemplateColumns: batchItems.length > 1
              ? (isSourceTextVisible ? '260px 1fr 1.2fr' : '260px 1fr')
              : (isSourceTextVisible ? '1fr 1.2fr' : '1.2fr')
          }}
        >
          
          {/* Batch Navigation Sidebar */}
          {batchItems.length > 1 && (
            <div className="card ingest-batch-list">
              <div className="ingest-section-head">
                <div>
                  <p className="eyebrow">Batch ({activeBatchIndex + 1}/{batchItems.length})</p>
                  <h3 style={{ marginBottom: 0 }}>Recipes</h3>
                </div>
              </div>
              <div className="ingest-batch-items">
                {batchItems.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => loadBatchItem(idx)}
                    className={`ingest-batch-item ${idx === activeBatchIndex ? 'active' : ''} ${item.status}`}
                  >
                    <div className="ingest-batch-title">
                      {item.candidate.title}
                    </div>
                    <div className="ingest-batch-status">
                      {item.status === 'ready' && '✅ Ready'}
                      {item.status === 'pending' && '⏳ Pending'}
                      {item.status === 'loading' && '🔄 Loading...'}
                      {item.status === 'saving' && '💾 Saving...'}
                      {item.status === 'saved' && '🎉 Saved'}
                      {item.status === 'error' && '❌ Error'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Left: Raw Text */}
          {isSourceTextVisible && (
            <div className="card source-card">
              <div className="ingest-section-head">
                <h3 className="text-muted" style={{ marginBottom: 0 }}>Source Text</h3>
                <button 
                  onClick={() => setIsSourceTextVisible(false)}
                  className="btn btn-secondary btn-sm"
                  title="Hide Source Text"
                >
                  Hide
                </button>
              </div>
              <pre className="text-mono text-muted source-text">
                {stagingRecipe.raw_text || inputValue}
              </pre>
            </div>
          )}
          
          {/* Right: Editable Recipe Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!isSourceTextVisible && (stagingRecipe.raw_text || inputValue) && (
              <button 
                onClick={() => setIsSourceTextVisible(true)}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-start' }}
                title="Show Source Text"
              >
                Show Source Text
              </button>
            )}
            
            <RecipeEditor
              recipe={stagingRecipe}
              onSave={handleApprove}
              isSaving={batchItems[activeBatchIndex]?.status === 'saving'}
              saveLabel="Approve & Save"
            />
          </div>
        </div>
      )}
    </div>
  );
}
