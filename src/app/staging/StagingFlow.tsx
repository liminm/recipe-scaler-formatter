'use client';

import { useState, useEffect } from 'react';
import { RecipeCandidate } from '@/services/ingestion/splitter';
import { StagingRecipe, StagingIngredient, StagingStep } from '@/types/staging';
import LoadingDumpling from '@/components/LoadingDumpling';

export default function StagingFlow() {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<RecipeCandidate[]>([]);
  const [step, setStep] = useState<'input' | 'selection' | 'editor'>('input');
  const [stagingRecipe, setStagingRecipe] = useState<StagingRecipe | null>(null);
  
  // Suggestion state for ingredients to remove
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);

  // Track original name for rename detection
  const [focusedIngredientName, setFocusedIngredientName] = useState<string | null>(null);

  // Hover state for highlighting affected steps
  const [hoveredIngredient, setHoveredIngredient] = useState<{ name: string; rawName?: string } | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onAlternative?: () => void;
    confirmText: string;
    alternativeText?: string;
  } | null>(null);

  // Helper: Extract searchable terms from ingredient name
  const getSearchTerms = (name: string): string[] => {
    return name
      .toLowerCase()
      .replace(/[()[\]]/g, '') // Remove parentheses and brackets
      .split(/[\s,]+/)         // Split on spaces and commas
      .filter(term => term.length >= 3); // Include 3+ letter words (e.g., "aji", "oil")
  };

  // Helper: Check if ingredient is mentioned in text (smart matching)
  const isIngredientMentioned = (ingredientName: string, text: string, rawName?: string): boolean => {
    const lowerText = text.toLowerCase();
    const normalizedLower = ingredientName.toLowerCase();
    
    // 1. Try exact match on normalized name
    if (lowerText.includes(normalizedLower)) {
      return true;
    }
    
    // 2. Try exact match on raw name (if different)
    if (rawName && rawName !== ingredientName) {
      const rawLower = rawName.toLowerCase();
      if (lowerText.includes(rawLower)) {
        return true;
      }
    }
    
    // 3. Tokenized fallback: check if any significant term appears
    const normalizedTerms = getSearchTerms(ingredientName);
    const rawTerms = rawName ? getSearchTerms(rawName) : [];
    const allTerms = [...new Set([...normalizedTerms, ...rawTerms])]; // Unique terms
    
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development' && ingredientName.toLowerCase().includes('chili')) {
      console.log('Matching ingredient:', ingredientName, 'raw:', rawName);
      console.log('Normalized terms:', normalizedTerms);
      console.log('Raw terms:', rawTerms);
      console.log('All unique terms:', allTerms);
      console.log('Text to search:', lowerText.substring(0, 100));
    }
    
    // Check if ANY term appears in the text (3+ chars to avoid false positives)
    for (const term of allTerms) {
      if (term.length >= 3 && lowerText.includes(term)) {
        if (process.env.NODE_ENV === 'development' && ingredientName.toLowerCase().includes('chili')) {
          console.log('✅ MATCH FOUND with term:', term);
        }
        return true;
      }
    }
    
    if (process.env.NODE_ENV === 'development' && ingredientName.toLowerCase().includes('chili')) {
      console.log('❌ NO MATCH - no terms found in text');
    }
    
    return false;
  };

  // Helper: Find steps that mention an ingredient
  const findStepsMentioning = (ingredientName: string, rawName?: string): number[] => {
    if (!stagingRecipe) return [];
    return stagingRecipe.steps
      .map((step, idx) => ({ step, idx }))
      .filter(({ step }) => 
        isIngredientMentioned(ingredientName, step.instruction_raw, rawName)
      )
      .map(({ idx }) => idx);
  };

  // Helper: Detect orphaned ingredients (in list but not mentioned in steps)
  const getOrphanedIngredients = (): string[] => {
    if (!stagingRecipe) return [];
    const allStepsText = stagingRecipe.steps.map(s => s.instruction_raw).join(' ');
    
    return stagingRecipe.ingredients
      .filter(ing => {
        const name = ing.name_normalized;
        if (!name) return false;
        return !isIngredientMentioned(name, allStepsText, ing.name_raw);
      })
      .map(ing => ing.name_normalized!)
      .filter(Boolean);
  };

  // Check if any ingredients are now orphaned after step text changes
  const checkForOrphanedAfterEdit = (currentSteps?: StagingStep[]) => {
    if (!stagingRecipe) return;
    
    const stepsToCheck = currentSteps || stagingRecipe.steps;
    const allStepsText = stepsToCheck.map(s => s.instruction_raw).join(' ');
    
    const orphaned = stagingRecipe.ingredients
      .filter(ing => {
        const name = ing.name_normalized;
        if (!name) return false;
        return !isIngredientMentioned(name, allStepsText, ing.name_raw);
      })
      .map(ing => ing.name_normalized!)
      .filter(Boolean);
    
    setIngredientSuggestions(orphaned);
  };

  // Smart ingredient removal
  const handleRemoveIngredient = (idx: number) => {
    if (!stagingRecipe) return;
    
    const ingredient = stagingRecipe.ingredients[idx];
    const ingredientName = ingredient.name_normalized || '';
    if (!ingredientName) {
      // If no name, just remove silently
      setStagingRecipe({
        ...stagingRecipe,
        ingredients: stagingRecipe.ingredients.filter((_, i) => i !== idx)
      });
      return;
    }
    
    const affectedStepIndices = findStepsMentioning(ingredientName, ingredient.name_raw);
    
    if (affectedStepIndices.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Ingredient Mentioned in Steps',
        message: `"${ingredientName}" is mentioned in ${affectedStepIndices.length} step(s). How would you like to proceed?`,
        confirmText: 'Remove & Update Steps',
        alternativeText: 'Remove from List Only',
        onConfirm: () => {
          // Remove ingredient and clean up step text
          const updatedSteps = stagingRecipe.steps.map(step => {
            let cleaned = step.instruction_raw;
            
            // Build list of names to search for
            const namesToRemove = [ingredientName];
            if (ingredient.name_raw && ingredient.name_raw !== ingredientName) {
              namesToRemove.push(ingredient.name_raw);
            }
            
            // Also add individual terms from both names
            const allTerms = new Set<string>();
            namesToRemove.forEach(name => {
              getSearchTerms(name).forEach(term => {
                if (term.length >= 3) allTerms.add(term);
              });
            });
            
            // Add all terms to the removal list
            allTerms.forEach(term => {
              if (!namesToRemove.includes(term)) {
                namesToRemove.push(term);
              }
            });
            
            // Sort by length descending to match longest phrases first
            namesToRemove.sort((a, b) => b.length - a.length);
            
            // Create patterns for each name variant
            for (const name of namesToRemove) {
              const patterns = [
                // "Chop the cilantro." or "dice the aji"
                new RegExp(`\\b(chop|dice|mince|slice|cut|add|mix|combine|stir in)\\s+the\\s+${name}[.,;]?\\s*`, 'gi'),
                // "cilantro, diced" or "aji (chopped)"
                new RegExp(`${name}\\s*[,;]?\\s*(\\([^)]*\\)|diced|chopped|minced|sliced)?[,;]?\\s*`, 'gi'),
                // Just the ingredient name with word boundaries
                new RegExp(`\\b${name}\\b[,;]?\\s*`, 'gi')
              ];
              
              // Try each pattern
              for (const pattern of patterns) {
                const before = cleaned;
                cleaned = cleaned.replace(pattern, '');
                // Continue replacing other occurrences of the same term
                while (cleaned !== before && new RegExp(pattern).test(cleaned)) {
                   cleaned = cleaned.replace(pattern, '');
                }
              }
            }
            
            // Clean up any awkward punctuation/spacing
            cleaned = cleaned
              .replace(/\s+/g, ' ')           // Multiple spaces to single
              .replace(/,?\s+and\s+[.,;]/gi, '.') // "and ." or ", and ." -> "."
              .replace(/,?\s+and\s*$/gi, '')      // Trailing "and" -> ""
              .replace(/,\s*\./g, '.')        // Comma before period
              .replace(/,\s*,/g, ',')         // Double commas
              .replace(/\band\s+and\b/gi, 'and') // Double "and"
              .replace(/,\s+and\s+([a-z])/gi, ', and $1') // Restore oxford comma if needed
              .replace(/\s+([.,;])/g, '$1')   // Space before punctuation (MOVED TO END)
              .replace(/([.,;])\s*([.,;])/g, '$1') // Double punctuation
              .replace(/\.\s+\./g, '.')       // Double periods
              .trim();
            
            return {
              ...step,
              instruction_raw: cleaned
            };
          });
          
          setStagingRecipe({
            ...stagingRecipe,
            ingredients: stagingRecipe.ingredients.filter((_, i) => i !== idx),
            steps: updatedSteps
          });
          setConfirmDialog(null);
        },
        onAlternative: () => {
          // Just remove from list
          setStagingRecipe({
            ...stagingRecipe,
            ingredients: stagingRecipe.ingredients.filter((_, i) => i !== idx)
          });
          setConfirmDialog(null);
        }
      });
    } else {
      // Not mentioned, just remove
      setStagingRecipe({
        ...stagingRecipe,
        ingredients: stagingRecipe.ingredients.filter((_, i) => i !== idx)
      });
    }
  };

  // Handle ingredient rename
  const handleRenameIngredient = (idx: number, newName: string) => {
    if (!stagingRecipe || !focusedIngredientName || focusedIngredientName === newName) return;
    
    const oldName = focusedIngredientName;
    const ingredient = stagingRecipe.ingredients[idx];
    
    // Find steps mentioning the OLD name
    const affectedStepIndices = findStepsMentioning(oldName, ingredient.name_raw);
    
    if (affectedStepIndices.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Update Step Instructions?',
        message: `You renamed "${oldName}" to "${newName}". Should we update the ${affectedStepIndices.length} step(s) that mention it?`,
        confirmText: 'Yes, Update Steps',
        alternativeText: 'No, Just Rename Ingredient',
        onConfirm: () => {
          // Update steps
          const updatedSteps = stagingRecipe.steps.map(step => {
            let updatedText = step.instruction_raw;
            
            // Create patterns for the old name
            const patterns = [
              new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
              // Handle "Aji (chili pepper)" -> "Aji" if needed, but mainly focus on the normalized name
            ];
            
            // Also try to match raw name if it's different
            if (ingredient.name_raw && ingredient.name_raw !== oldName) {
               patterns.push(new RegExp(`\\b${ingredient.name_raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
            }

            // Replace with new name
            for (const pattern of patterns) {
              updatedText = updatedText.replace(pattern, newName);
            }
            
            return {
              ...step,
              instruction_raw: updatedText
            };
          });
          
          setStagingRecipe({
            ...stagingRecipe,
            steps: updatedSteps
          });
          setConfirmDialog(null);
          setFocusedIngredientName(null);
        },
        onAlternative: () => {
          setConfirmDialog(null);
          setFocusedIngredientName(null);
        }
      });
    } else {
      setFocusedIngredientName(null);
    }
  };

  // Step text change handler
  const handleStepTextChange = (idx: number, newText: string) => {
    if (!stagingRecipe) return;
    
    const updatedSteps = [...stagingRecipe.steps];
    updatedSteps[idx] = { ...updatedSteps[idx], instruction_raw: newText };
    
    setStagingRecipe({
      ...stagingRecipe,
      steps: updatedSteps
    });
    
    // Check for orphans immediately with the new steps
    // (Debouncing inside a handler without a ref doesn't work as expected, 
    // and this operation is fast enough to run on change)
    checkForOrphanedAfterEdit(updatedSteps);
  };

  // Remove orphaned ingredients suggested by the banner
  const removeOrphanedIngredients = () => {
    if (!stagingRecipe) return;
    
    setStagingRecipe({
      ...stagingRecipe,
      ingredients: stagingRecipe.ingredients.filter(ing => 
        !ingredientSuggestions.includes(ing.name_normalized || '')
      )
    });
    setIngredientSuggestions([]);
  };
  
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

  const handlePolishSteps = async () => {
    if (!stagingRecipe) return;
    setIsLoading(true);
    try {
      const stepsText = stagingRecipe.steps.map(s => s.instruction_raw);
      
      const res = await fetch('/api/ingest/polish', {
        method: 'POST',
        body: JSON.stringify({ steps: stepsText }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const polishedSteps = data.polishedSteps as string[];
      
      if (polishedSteps.length !== stagingRecipe.steps.length) {
        throw new Error('Mismatch in number of steps returned');
      }
      
      const updatedSteps = stagingRecipe.steps.map((step, idx) => ({
        ...step,
        instruction_raw: polishedSteps[idx]
      }));
      
      setStagingRecipe({
        ...stagingRecipe,
        steps: updatedSteps
      });
      
      // Re-check for orphans after polish
      checkForOrphanedAfterEdit(updatedSteps);
      
    } catch (error: any) {
      console.error(error);
      alert(`Failed to polish steps: ${error.message}`);
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
      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%' }}>
            <h3>{confirmDialog.title}</h3>
            <p className="my-4">{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              {confirmDialog.alternativeText && (
                <button 
                  className="btn btn-secondary"
                  onClick={confirmDialog.onAlternative}
                >
                  {confirmDialog.alternativeText}
                </button>
              )}
              <button 
                className="btn btn-primary"
                onClick={confirmDialog.onConfirm}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'input' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          {isLoading ? (
            <LoadingDumpling 
              message={inputMode === 'url' ? 'Fetching recipe from URL...' : 'Processing recipe text...'}
              size="medium"
            />
          ) : (
            <>
              <h2 style={{ marginBottom: '1rem' }}>Ingest Recipe</h2>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button 
                  className={`btn ${inputMode === 'url' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setInputMode('url')}
                >
                  From URL
                </button>
                <button 
                  className={`btn ${inputMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setInputMode('text')}
                >
                  From Text
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
                className="btn btn-primary w-full"
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
              >
                Analyze
              </button>
            </>
          )}
        </div>
      )}
      
      {step === 'selection' && (
        <div>
          {isLoading ? (
            <LoadingDumpling 
              message="Extracting recipe details with AI... This may take 20-30 seconds."
              size="large"
            />
          ) : (
            <>
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
                    >
                      Import This
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
            </>
          )}
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
            {/* Orphaned Ingredients Warning */}
            {getOrphanedIngredients().length > 0 && (
              <div style={{ 
                background: 'var(--color-warning)', 
                color: '#5c4208', 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1.5rem',
                border: '1px solid #e6c86e'
              }}>
                <strong>⚠️ Orphaned Ingredients:</strong> These ingredients are in your list but not mentioned in any step:
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {getOrphanedIngredients().map(name => (
                    <span key={name} style={{ 
                      background: 'rgba(255,255,255,0.5)', 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '1rem',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredient Removal Suggestion */}
            {ingredientSuggestions.length > 0 && (
              <div style={{ 
                background: '#e6f4ea', 
                color: '#1e4620', 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1.5rem',
                border: '1px solid #c6e7ce',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>💡 Suggestion:</strong> You removed mentions of these ingredients. Remove them from the list?
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {ingredientSuggestions.map(name => (
                      <span key={name} style={{ 
                        background: 'rgba(255,255,255,0.5)', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '1rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-sm"
                    onClick={() => setIngredientSuggestions([])}
                    style={{ fontSize: '0.875rem', padding: '0.3rem 0.8rem' }}
                  >
                    Keep Them
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={removeOrphanedIngredients}
                    style={{ fontSize: '0.875rem', padding: '0.3rem 0.8rem' }}
                  >
                    Remove These Ingredients
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="text"
                value={stagingRecipe.title}
                onChange={(e) => setStagingRecipe({ ...stagingRecipe, title: e.target.value })}
                className="input-field"
                style={{ fontSize: '1.5rem', fontWeight: 'bold', border: 'none', background: 'transparent', padding: 0 }}
              />
              <button 
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Approve & Save'}
              </button>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Ingredients</h3>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const newIngredient: StagingIngredient = {
                      id: crypto.randomUUID(),
                      name_raw: '',
                      name_normalized: '',
                      quantity_raw: '',
                      base_quantity_g: 0,
                      state: 'fresh',
                      role: 'CONSUMABLE',
                      yield_factor: 1,
                      is_discrete: false,
                      dependency_role: 'PASSENGER',
                      density_confidence: 'high',
                      needs_review: false
                    };
                    setStagingRecipe({
                      ...stagingRecipe,
                      ingredients: [...stagingRecipe.ingredients, newIngredient]
                    });
                  }}
                >
                  + Add Ingredient
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stagingRecipe.ingredients.map((ing, idx) => (
                  <div 
                    key={ing.id} 
                    className="card" 
                    style={{ 
                      padding: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: hoveredIngredient?.name === ing.name_normalized 
                        ? '2px solid var(--color-primary)' 
                        : '2px solid var(--color-border)'
                    }}
                    onMouseEnter={() => setHoveredIngredient({ 
                      name: ing.name_normalized || '', 
                      rawName: ing.name_raw 
                    })}
                    onMouseLeave={() => setHoveredIngredient(null)}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Name"
                        value={ing.name_normalized || ''}
                        onChange={(e) => {
                          const newIngredients = [...stagingRecipe.ingredients];
                          newIngredients[idx] = { ...ing, name_normalized: e.target.value };
                          setStagingRecipe({ ...stagingRecipe, ingredients: newIngredients });
                        }}
                        className="input-field"
                        onFocus={() => setFocusedIngredientName(ing.name_normalized || '')}
                        onBlur={(e) => handleRenameIngredient(idx, e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Qty (g)"
                        value={ing.base_quantity_g || ''}
                        onChange={(e) => {
                          const newIngredients = [...stagingRecipe.ingredients];
                          newIngredients[idx] = { ...ing, base_quantity_g: parseFloat(e.target.value) || 0 };
                          setStagingRecipe({ ...stagingRecipe, ingredients: newIngredients });
                        }}
                        className="input-field"
                      />
                      <select
                        value={ing.state || 'fresh'}
                        onChange={(e) => {
                          const newIngredients = [...stagingRecipe.ingredients];
                          newIngredients[idx] = { ...ing, state: e.target.value as any };
                          setStagingRecipe({ ...stagingRecipe, ingredients: newIngredients });
                        }}
                        className="input-field"
                      >
                        <option value="fresh">Fresh</option>
                        <option value="dry">Dry</option>
                        <option value="frozen">Frozen</option>
                        <option value="canned">Canned</option>
                      </select>
                      <select
                        value={ing.role || 'CONSUMABLE'}
                        onChange={(e) => {
                          const newIngredients = [...stagingRecipe.ingredients];
                          newIngredients[idx] = { ...ing, role: e.target.value as any };
                          setStagingRecipe({ ...stagingRecipe, ingredients: newIngredients });
                        }}
                        className="input-field"
                      >
                        <option value="CONSUMABLE">Consumable</option>
                        <option value="PROCESS_ONLY">Process Only</option>
                        <option value="REDUCTION">Reduction</option>
                      </select>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveIngredient(idx)}
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Steps</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-sm"
                    onClick={handlePolishSteps}
                    style={{ 
                      background: 'linear-gradient(135deg, #e8956f 0%, #d4a574 100%)', 
                      color: 'white',
                      border: 'none'
                    }}
                    title="Fix grammar and flow with AI"
                  >
                    ✨ Polish with AI
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const newStep: StagingStep = {
                        id: crypto.randomUUID(),
                        instruction_raw: '',
                        order: stagingRecipe.steps.length + 1,
                        constraint_tags: [],
                        time_estimate_minutes: 0
                      };
                      setStagingRecipe({
                        ...stagingRecipe,
                        steps: [...stagingRecipe.steps, newStep]
                      });
                    }}
                  >
                    + Add Step
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stagingRecipe.steps.map((stepItem, idx) => {
                  // Check if this step mentions the hovered ingredient
                  const isHighlighted = hoveredIngredient && isIngredientMentioned(
                    hoveredIngredient.name,
                    stepItem.instruction_raw,
                    hoveredIngredient.rawName
                  );
                  
                  return (
                    <div 
                      key={stepItem.id} 
                      className="card" 
                      style={{ 
                        padding: '0.75rem',
                        transition: 'all 0.2s ease',
                        border: isHighlighted 
                          ? '2px solid var(--color-primary)' 
                          : '2px solid var(--color-border)',
                        background: isHighlighted 
                          ? 'rgba(232, 149, 111, 0.05)' 
                          : 'var(--color-surface)'
                      }}
                    >
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                      <span className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, minWidth: '2rem' }}>
                        {idx + 1}.
                      </span>
                      <div style={{ flex: 1 }}>
                        <textarea
                          value={stepItem.instruction_raw}
                          onChange={(e) => handleStepTextChange(idx, e.target.value)}
                          className="input-field"
                          rows={3}
                          style={{ width: '100%', resize: 'vertical' }}
                        />
                      </div>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          const newSteps = stagingRecipe.steps.filter((_, i) => i !== idx);
                          setStagingRecipe({ ...stagingRecipe, steps: newSteps });
                        }}
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        ×
                      </button>
                    </div>
                    {stepItem.constraint_tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginLeft: '2.5rem' }}>
                        {stepItem.constraint_tags.map(tag => (
                          <span key={tag} style={{ fontSize: '0.75rem', background: 'var(--color-warning)', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
