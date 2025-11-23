'use client';

import { useState, useEffect } from 'react';
import { RecipeCandidate } from '@/services/ingestion/splitter';
import { StagingRecipe, StagingIngredient, StagingStep } from '@/types/staging';
import LoadingDumpling from '@/components/LoadingDumpling';
import { estimateYield } from '@/services/ingestion/yieldCalculator';
import { useDebug } from '@/context/DebugContext';

interface BatchItem {
  candidate: RecipeCandidate;
  status: 'pending' | 'loading' | 'ready' | 'saving' | 'saved' | 'error';
  recipe: StagingRecipe | null;
  error?: string;
}

export default function StagingFlow() {
  const { isDebugMode } = useDebug();
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
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
              .replace(/\s+,/g, ',')          // Space before comma " ," -> ","
              .replace(/,?\s+and\s+[.,;]/gi, '.') // "and ." or ", and ." -> "."
              .replace(/,?\s+and\s*$/gi, '')      // Trailing "and" -> ""
              .replace(/,\s*\./g, '.')        // Comma before period
              .replace(/,\s*,/g, ',')         // Double commas
              .replace(/\band\s+and\b/gi, 'and') // Double "and"
              .replace(/,\s+and\b/gi, ' and') // ", and" -> " and" (simplify lists)
              .replace(/\s+([.,;])/g, '$1')   // Space before punctuation
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

  // Auto-recalculate yield when ingredients or steps change (debounced)
  useEffect(() => {
    if (!stagingRecipe || stagingRecipe.ingredients.length === 0) return;
    
    // Debounce: wait 2 seconds after last change before recalculating
    const timeoutId = setTimeout(async () => {
      try {
        const yieldEstimate = await estimateYield(stagingRecipe.ingredients, stagingRecipe.steps);
        setStagingRecipe((prev: StagingRecipe | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            estimated_final_weight_g: yieldEstimate.estimatedFinalWeight_g,
            yield_confidence: yieldEstimate.confidence
          };
        });
      } catch (error) {
        console.error('Auto-recalculate yield failed:', error);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [stagingRecipe?.ingredients, stagingRecipe?.steps]); // Recalculate when ingredients or steps change
  
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
        titleHint: candidate.title 
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
        alert('All recipes in batch processed!');
        // Maybe redirect or show summary?
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
              
              {isDebugMode && (
                <button 
                  className="btn btn-secondary w-full mt-4"
                  onClick={handleMockSplit}
                  style={{ border: '1px dashed #666' }}
                >
                  🔧 Debug: Mock Split (3 Recipes)
                </button>
              )}
            </>
          )}
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
        <div style={{ display: 'grid', gridTemplateColumns: batchItems.length > 1 ? '250px 1fr 1fr' : '1fr 1fr', gap: '2rem', height: '80vh' }}>
          
          {/* Batch Navigation Sidebar */}
          {batchItems.length > 1 && (
            <div className="card" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 className="mb-4">Batch ({activeBatchIndex + 1}/{batchItems.length})</h3>
              {batchItems.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => loadBatchItem(idx)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    background: idx === activeBatchIndex ? 'rgba(232, 149, 111, 0.1)' : 'var(--color-surface)',
                    border: idx === activeBatchIndex ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    opacity: item.status === 'pending' ? 0.7 : 1
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.candidate.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      {item.status === 'ready' && '✅ Ready'}
                      {item.status === 'pending' && '⏳ Pending'}
                      {item.status === 'loading' && '🔄 Loading...'}
                      {item.status === 'saving' && '💾 Saving...'}
                      {item.status === 'saved' && '🎉 Saved'}
                      {item.status === 'error' && '❌ Error'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                disabled={batchItems[activeBatchIndex]?.status === 'saving'}
              >
                {batchItems[activeBatchIndex]?.status === 'saving' ? 'Saving...' : 'Approve & Save'}
              </button>
            </div>
            
            {/* Yield Estimate Display */}
            {stagingRecipe.estimated_final_weight_g && (
              <div style={{ 
                background: 'var(--color-surface)', 
                padding: '0.75rem 1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1.5rem',
                border: '1px solid var(--color-border)',
                display: 'flex',
                gap: '2rem',
                alignItems: 'center'
              }}>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                    Estimated Final Weight
                  </span>
                  <div className="yield-badge">
                    Estimated Yield: ~{stagingRecipe.estimated_final_weight_g}g 
                    {stagingRecipe.yield_confidence === 'high' ? ' 🟢' : 
                     stagingRecipe.yield_confidence === 'medium' ? ' 🟡' : ' 🔴'}
                  </div>
                </div>

                {stagingRecipe.original_yield_servings && (
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                      Original Yield
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                      {stagingRecipe.original_yield_servings} servings
                    </span>
                  </div>
                )}

                {isDebugMode && (
                  <div style={{ 
                    padding: '0.5rem', 
                    background: '#333', 
                    color: '#0f0', 
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    marginLeft: 'auto'
                  }}>
                    <div>🔧 <strong>Extraction:</strong> {stagingRecipe.extraction_model || 'Unknown'}</div>
                    <div>🔧 <strong>Yield Est:</strong> {stagingRecipe.yield_estimation_model || 'Unknown'}</div>
                  </div>
                )}
              </div>
            )}
            
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.5rem' }}>
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
                          value={ing.base_quantity_g}
                          onChange={(e) => {
                            const newIngredients = [...stagingRecipe.ingredients];
                            newIngredients[idx] = { ...ing, base_quantity_g: parseFloat(e.target.value) || 0 };
                            setStagingRecipe({ ...stagingRecipe, ingredients: newIngredients });
                          }}
                          className="input-field"
                          style={{ color: 'var(--color-text)' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem' }}>
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
                          style={{ padding: '0.25rem 0.75rem' }}
                        >
                          ×
                        </button>
                      </div>
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
                          rows={5}
                          style={{ width: '100%', resize: 'vertical', color: 'var(--color-text)' }}
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
