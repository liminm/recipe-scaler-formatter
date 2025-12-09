'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecipeCandidate } from '@/services/ingestion/splitter';
import { StagingRecipe, StagingIngredient, StagingStep } from '@/types/staging';
import LoadingDumpling from '@/components/LoadingDumpling';
import { estimateYield } from '@/services/ingestion/yieldCalculator';
import { useChili } from '@/context/ChiliContext';
import RecipeEditor from '@/components/RecipeEditor';
import ScaleView from '@/components/ScaleView';

interface BatchItem {
  candidate: RecipeCandidate;
  status: 'pending' | 'loading' | 'ready' | 'saving' | 'saved' | 'error';
  recipe: StagingRecipe | null;
  error?: string;
}

export default function StagingFlow() {
  const router = useRouter();
  const { isChiliMode } = useChili();
  const [inputMode, setInputMode] = useState<'url' | 'text' | 'manual'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [candidates, setCandidates] = useState<RecipeCandidate[]>([]);
  const [step, setStep] = useState<'input' | 'selection' | 'editor' | 'scale'>('input');
  const [stagingRecipe, setStagingRecipe] = useState<StagingRecipe | null>(null);
  
  // Source text visibility toggle
  const [isSourceTextVisible, setIsSourceTextVisible] = useState(true);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const [mobileBatchOpen, setMobileBatchOpen] = useState(false);

  const [loadingStage, setLoadingStage] = useState('Initializing...');

  // Handle Quick Ingest from Home Screen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const mode = params.get('mode');

    if (!query && !mode) {
      // No input? Go back to home.
      router.push('/');
      return;
    }

    if (mode === 'manual') {
      setInputMode('manual');
      // Auto-start manual mode
      const blankRecipe: StagingRecipe = {
        id: crypto.randomUUID(),
        title: 'Untitled Recipe',
        ingredients: [],
        steps: [],
        chefs_notes: [],
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
      setIsSourceTextVisible(false);
      setStep('editor');
    } else if (query) {
      setInputValue(query);
      // Determine mode
      if (query.startsWith('http')) {
        setInputMode('url');
        setLoadingStage('Fetching recipe from URL...');
      } else {
        setInputMode('text');
        setLoadingStage('Processing recipe text...');
      }
      
      // Trigger auto-submit
      setShouldAutoSubmit(true);
    }
  }, []); // Run once on mount

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let textToSplit = inputValue;
      
      if (inputMode === 'url') {
        setLoadingStage('Fetching & cleaning source...');
        const res = await fetch('/api/ingest/scrape', {
          method: 'POST',
          body: JSON.stringify({ url: inputValue }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        textToSplit = data.rawText;
      }
      
      setLoadingStage('Splitting into recipes...');
      const res = await fetch('/api/ingest/split', {
        method: 'POST',
        body: JSON.stringify({ text: textToSplit }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setLoadingStage('Extracting ingredients & steps...');
      setCandidates(data.candidates);
      setStep('selection');
      
    } catch (error) {
      console.error(error);
      alert('Failed to process input');
      router.push('/'); // Go back to home on error
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit effect
  useEffect(() => {
    if (shouldAutoSubmit && inputValue && !isLoading && step === 'input') {
      handleSubmit();
      setShouldAutoSubmit(false);
    }
  }, [shouldAutoSubmit, inputValue, isLoading, step]);
  
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
    
    setIsLoading(true);
    setLoadingMessage(`Extracting ${selected[0].title}...`);
    
    try {
      const firstRecipe = await fetchRecipe(selected[0]);
      
      newBatchItems[0].status = 'ready';
      newBatchItems[0].recipe = firstRecipe;
      
      setBatchItems(newBatchItems);
      setActiveBatchIndex(0);
      setStagingRecipe(firstRecipe);
      setStep('editor');
      
      if (newBatchItems.length > 1) {
         triggerPrefetch(newBatchItems, 0);
      }
      
    } catch (error: any) {
       console.error(error);
       alert('Failed to start batch import');
       setBatchItems(newBatchItems); 
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
    const newBatchItems: BatchItem[] = [{
      candidate,
      status: 'pending',
      recipe: null
    }];
    setBatchItems(newBatchItems);
    
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
    
    setBatchItems(prev => prev.map((item, idx) => 
      idx === activeBatchIndex ? { ...item, status: 'saving' } : item
    ));
    
    try {
      const res = await fetch('/api/recipes/create', {
        method: 'POST',
        body: JSON.stringify({ stagingRecipe }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setBatchItems(prev => prev.map((item, idx) => 
        idx === activeBatchIndex ? { ...item, status: 'saved' } : item
      ));
      
      const nextIndex = activeBatchIndex + 1;
      if (nextIndex < batchItems.length) {
        loadBatchItem(nextIndex);
      } else {
        if (batchItems.length === 1) {
          router.push(`/recipes/${data.recipeId}`);
        } else {
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
        <div className="ingest-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="ingest-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <div className="ingest-loading-main card" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
              <LoadingDumpling
                message={loadingStage}
                size="large"
              />
            </div>
          </div>
        </div>
      )}
      
      {step === 'selection' && (
        <>
          {isLoading ? (
            <div className="ingest-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <div className="ingest-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                <div className="ingest-loading-main card" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
                  <LoadingDumpling
                    message={loadingMessage || "Extracting recipe details with AI..."}
                    size="large"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="selection-wrap">

              <div className="selection-head">
                <div>
                  <p className="eyebrow">Select recipe</p>
                  <h2 className="mb-0">We found {candidates.length} potential recipe{candidates.length === 1 ? '' : 's'}</h2>
                  <p className="text-muted">Choose one or more to import into the editor.</p>
                </div>
                <div className="selection-actions">
                  <button 
                    className="btn"
                    onClick={() => setStep('input')}
                  >
                    ← Back
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={selectedCandidateIndices.size === 0}
                    onClick={handleBatchImport}
                  >
                    Import Selected ({selectedCandidateIndices.size})
                  </button>
                </div>
              </div>

              <div className="selection-panel card">
                <div className="selection-grid">
                  {candidates.map((c) => {
                    const isSelected = selectedCandidateIndices.has(c.index);
                    return (
                      <button
                        key={c.index}
                        className={`selection-card ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleCandidateSelection(c.index)}
                      >
                        <div className="selection-card-head">
                          <div className="selection-title">
                            <h3 className="mb-0">{c.title}</h3>
                            <p className="selection-summary text-muted">{c.summary}</p>
                          </div>
                          <div className={`selection-check ${isSelected ? 'checked' : ''}`} aria-hidden>
                            {isSelected ? '✔' : ''}
                          </div>
                        </div>
                        <div className="selection-snippet">
                          “{c.originalTextSnippet}...”
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
            </div>
          )}
        </>
      )}
      

      {step === 'editor' && stagingRecipe && (
        <div
          className="ingest-editor-grid mobile-cols-1"
          style={{
            gridTemplateColumns: batchItems.length > 1
              ? (isSourceTextVisible ? '260px 1fr 1.2fr' : '260px 1fr')
              : (isSourceTextVisible ? '1fr 1.2fr' : '1.2fr')
          }}
        >
          
          {/* Mobile Batch Indicator */}
          {batchItems.length > 1 && (
            <button 
              className="mobile-batch-indicator mobile-show"
              onClick={() => setMobileBatchOpen(!mobileBatchOpen)}
            >
              {activeBatchIndex + 1} / {batchItems.length}
            </button>
          )}

          {/* Batch Navigation Sidebar */}
          {batchItems.length > 1 && (
            <div className={`card ingest-batch-list ${mobileBatchOpen ? 'mobile-visible' : ''}`}>
              <div className="ingest-section-head">
                <div>
                  <p className="eyebrow">Batch ({activeBatchIndex + 1}/{batchItems.length})</p>
                  <h3 style={{ marginBottom: 0 }}>Recipes</h3>
                </div>
                <button 
                  className="mobile-show btn btn-secondary"
                  onClick={() => setMobileBatchOpen(false)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
              <div className="ingest-batch-items">
                {batchItems.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      loadBatchItem(idx);
                      setMobileBatchOpen(false);
                    }}
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
              onScaleExport={() => setStep('scale')}
              isSaving={batchItems[activeBatchIndex]?.status === 'saving'}
              saveLabel="Save to Library"
            />
          </div>
        </div>
      )}

      {step === 'scale' && stagingRecipe && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <ScaleView
            recipe={stagingRecipe}
            onBack={() => setStep('editor')}
            onSave={async (recipe) => {
              await handleApprove();
            }}
          />
        </div>
      )}
    </div>
  );
}
