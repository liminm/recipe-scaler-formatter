'use client';

import { useState, useEffect } from 'react';
import { StagingRecipe, StagingIngredient, StagingStep } from '@/types/staging';

interface RecipeEditorProps {
  recipe: StagingRecipe;
  onSave: (recipe: StagingRecipe) => void;
  onScaleExport?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
}

export default function RecipeEditor({ 
  recipe: initialRecipe, 
  onSave,
  onScaleExport,
  onCancel,
  isSaving = false,
  saveLabel = 'Save Recipe'
}: RecipeEditorProps) {
  const [recipe, setRecipe] = useState<StagingRecipe>(initialRecipe);
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [focusedIngredientName, setFocusedIngredientName] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isCalculatingYield, setIsCalculatingYield] = useState(false);
  
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

  // Weight for display only (no scaling in editor anymore)

  // Helper: Extract searchable terms from ingredient name
  const getSearchTerms = (name: string): string[] => {
    return name
      .toLowerCase()
      .replace(/[()[\]]/g, '') // Remove parentheses and brackets
      .split(/[\s,]+/)         // Split on spaces and commas
      .filter(term => term.length >= 3); // Include 3+ letter words
  };

  // Helper: Check if ingredient is mentioned in text (smart matching)
  const isIngredientMentioned = (ingredientName: string, text: string, rawName?: string): boolean => {
    const lowerText = text.toLowerCase();
    const normalizedLower = ingredientName.toLowerCase();
    
    // 1. Try exact match on normalized name
    if (lowerText.includes(normalizedLower)) return true;
    
    // 2. Try exact match on raw name (if different)
    if (rawName && rawName !== ingredientName) {
      const rawLower = rawName.toLowerCase();
      if (lowerText.includes(rawLower)) return true;
    }
    
    // 3. Tokenized fallback
    const normalizedTerms = getSearchTerms(ingredientName);
    const rawTerms = rawName ? getSearchTerms(rawName) : [];
    const allTerms = [...new Set([...normalizedTerms, ...rawTerms])];
    
    for (const term of allTerms) {
      if (term.length >= 3 && lowerText.includes(term)) {
        return true;
      }
    }
    
    return false;
  };

  // Helper: Find steps that mention an ingredient
  const findStepsMentioning = (ingredientName: string, rawName?: string): number[] => {
    return recipe.steps
      .map((step, idx) => ({ step, idx }))
      .filter(({ step }) => 
        isIngredientMentioned(ingredientName, step.instruction_raw, rawName)
      )
      .map(({ idx }) => idx);
  };

  // Check if any ingredients are now orphaned after step text changes
  const checkForOrphanedAfterEdit = (currentSteps?: StagingStep[]) => {
    const stepsToCheck = currentSteps || recipe.steps;
    const allStepsText = stepsToCheck.map(s => s.instruction_raw).join(' ');
    
    const orphaned = recipe.ingredients
      .filter(ing => {
        const name = ing.name_normalized;
        if (!name) return false;
        return !isIngredientMentioned(name, allStepsText, ing.name_raw);
      })
      .map(ing => ing.name_normalized!)
      .filter(Boolean);
    
    setIngredientSuggestions(orphaned);
  };

  // Initial check for orphans
  useEffect(() => {
    checkForOrphanedAfterEdit();
  }, []);

  // Smart ingredient removal
  const handleRemoveIngredient = (idx: number) => {
    const ingredient = recipe.ingredients[idx];
    const ingredientName = ingredient.name_normalized || '';
    
    if (!ingredientName) {
      setRecipe({
        ...recipe,
        ingredients: recipe.ingredients.filter((_, i) => i !== idx)
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
          const updatedSteps = recipe.steps.map(step => {
            let cleaned = step.instruction_raw;
            
            const namesToRemove = [ingredientName];
            if (ingredient.name_raw && ingredient.name_raw !== ingredientName) {
              namesToRemove.push(ingredient.name_raw);
            }
            
            const allTerms = new Set<string>();
            namesToRemove.forEach(name => {
              getSearchTerms(name).forEach(term => {
                if (term.length >= 3) allTerms.add(term);
              });
            });
            
            allTerms.forEach(term => {
              if (!namesToRemove.includes(term)) namesToRemove.push(term);
            });
            
            namesToRemove.sort((a, b) => b.length - a.length);
            
            for (const name of namesToRemove) {
              const patterns = [
                new RegExp(`\\b(chop|dice|mince|slice|cut|add|mix|combine|stir in)\\s+the\\s+${name}[.,;]?\\s*`, 'gi'),
                new RegExp(`${name}\\s*[,;]?\\s*(\\([^)]*\\)|diced|chopped|minced|sliced)?[,;]?\\s*`, 'gi'),
                new RegExp(`\\b${name}\\b[,;]?\\s*`, 'gi')
              ];
              
              for (const pattern of patterns) {
                const before = cleaned;
                cleaned = cleaned.replace(pattern, '');
                while (cleaned !== before && new RegExp(pattern).test(cleaned)) {
                   cleaned = cleaned.replace(pattern, '');
                }
              }
            }
            
            cleaned = cleaned
              .replace(/\s+/g, ' ')
              .replace(/\s+,/g, ',')
              .replace(/,?\s+and\s+[.,;]/gi, '.')
              .replace(/,?\s+and\s*$/gi, '')
              .replace(/,\s*\./g, '.')
              .replace(/,\s*,/g, ',')
              .replace(/\band\s+and\b/gi, 'and')
              .replace(/,\s+and\b/gi, ' and')
              .replace(/\s+([.,;])/g, '$1')
              .replace(/([.,;])\s*([.,;])/g, '$1')
              .replace(/\.\s+\./g, '.')
              .trim();
            
            return { ...step, instruction_raw: cleaned };
          });
          
          setRecipe({
            ...recipe,
            ingredients: recipe.ingredients.filter((_, i) => i !== idx),
            steps: updatedSteps
          });
          setConfirmDialog(null);
        },
        onAlternative: () => {
          setRecipe({
            ...recipe,
            ingredients: recipe.ingredients.filter((_, i) => i !== idx)
          });
          setConfirmDialog(null);
        }
      });
    } else {
      setRecipe({
        ...recipe,
        ingredients: recipe.ingredients.filter((_, i) => i !== idx)
      });
    }
  };

  // Handle ingredient rename
  const handleRenameIngredient = (idx: number, newName: string) => {
    if (!focusedIngredientName || focusedIngredientName === newName) return;
    
    const oldName = focusedIngredientName;
    const ingredient = recipe.ingredients[idx];
    
    const affectedStepIndices = findStepsMentioning(oldName, ingredient.name_raw);
    
    if (affectedStepIndices.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Update Step Instructions?',
        message: `You renamed "${oldName}" to "${newName}". Should we update the ${affectedStepIndices.length} step(s) that mention it?`,
        confirmText: 'Yes, Update Steps',
        alternativeText: 'No, Just Rename Ingredient',
        onConfirm: () => {
          const updatedSteps = recipe.steps.map(step => {
            let updatedText = step.instruction_raw;
            const patterns = [
              new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
            ];
            
            if (ingredient.name_raw && ingredient.name_raw !== oldName) {
               patterns.push(new RegExp(`\\b${ingredient.name_raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
            }

            for (const pattern of patterns) {
              updatedText = updatedText.replace(pattern, newName);
            }
            
            return { ...step, instruction_raw: updatedText };
          });
          
          setRecipe({ ...recipe, steps: updatedSteps });
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
    const updatedSteps = [...recipe.steps];
    updatedSteps[idx] = { ...updatedSteps[idx], instruction_raw: newText };
    
    setRecipe({ ...recipe, steps: updatedSteps });
    checkForOrphanedAfterEdit(updatedSteps);
  };

  // Remove orphaned ingredients
  const removeOrphanedIngredients = () => {
    setRecipe({
      ...recipe,
      ingredients: recipe.ingredients.filter(ing => 
        !ingredientSuggestions.includes(ing.name_normalized || '')
      )
    });
    setIngredientSuggestions([]);
  };

  // Auto-recalculate yield
  useEffect(() => {
    if (recipe.ingredients.length === 0) return;
    
    // Skip if we already have a valid weight (e.g., loaded from DB)
    // But recalculate if weight is missing/0 or when ingredients/steps actually change
    const hasValidWeight = recipe.estimated_final_weight_g && recipe.estimated_final_weight_g > 0;
    
    setIsCalculatingYield(true);
    
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch('/api/ingest/yield', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ingredients: recipe.ingredients, 
            steps: recipe.steps 
          })
        });
        
        if (!res.ok) throw new Error('Yield API failed');
        
        const yieldEstimate = await res.json();
        
        setRecipe(prev => ({
          ...prev,
          estimated_final_weight_g: yieldEstimate.estimatedFinalWeight_g,
          yield_confidence: yieldEstimate.confidence
        }));
      } catch (error) {
        console.error('Auto-recalculate yield failed:', error);
      } finally {
        setIsCalculatingYield(false);
      }
    }, hasValidWeight ? 2000 : 100); // Run immediately if weight missing, otherwise debounce

    return () => clearTimeout(timeoutId);
  }, [recipe.ingredients, recipe.steps]);

  const [isCopied, setIsCopied] = useState(false);

  const handleCopyText = async () => {
    const lines = [];
    lines.push(recipe.title);
    if (recipe.summary) lines.push(recipe.summary);
    lines.push('');
    
    // Weight info
    if (recipe.estimated_final_weight_g) {
      lines.push(`Total Weight: ${(recipe.estimated_final_weight_g / 1000).toFixed(2)} kg`);
    }
    lines.push('');

    lines.push('Ingredients:');
    recipe.ingredients.forEach(ing => {
      const qty = ing.base_quantity_g ? ing.base_quantity_g.toFixed(1) : '';
      const name = ing.name_normalized || ing.name_raw;
      lines.push(`- ${qty}${qty ? 'g' : ''} ${name}`);
    });
    lines.push('');

    lines.push('Instructions:');
    recipe.steps.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step.instruction_raw}`);
    });

    if (recipe.chefs_notes && recipe.chefs_notes.length > 0) {
      lines.push('');
      lines.push("Chef's Notes:");
      recipe.chefs_notes.forEach(note => lines.push(`- ${note}`));
    }

    if (recipe.source_url) {
      lines.push('');
      lines.push(`Source: ${recipe.source_url}`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    }
  };

  const handlePolishSteps = async () => {
    setIsPolishing(true);
    try {
      const stepsText = recipe.steps.map(s => s.instruction_raw);
      
      const res = await fetch('/api/ingest/polish', {
        method: 'POST',
        body: JSON.stringify({ steps: stepsText }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const polishedSteps = data.polishedSteps as string[];
      
      if (polishedSteps.length !== recipe.steps.length) {
        throw new Error('Mismatch in number of steps returned');
      }
      
      const updatedSteps = recipe.steps.map((step, idx) => ({
        ...step,
        instruction_raw: polishedSteps[idx]
      }));
      
      setRecipe({ ...recipe, steps: updatedSteps });
      checkForOrphanedAfterEdit(updatedSteps);
      
    } catch (error: any) {
      console.error(error);
      alert(`Failed to polish steps: ${error.message}`);
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <div className="card has-mobile-action-bar">
      {/* ... (confirmation dialog) ... */}

      <div className="mobile-stack mobile-gap-md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, marginRight: '2rem' }} className="mobile-full-width">
          {/* ... (title input) ... */}
          
          {/* Metadata Fields */}
          <div className="mobile-cols-1 mobile-gap-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Weight</label>
              <div className="input-field" style={{ background: '#f5f5f5', color: '#666' }}>
                {recipe.estimated_final_weight_g 
                  ? `${(recipe.estimated_final_weight_g / 1000).toFixed(2)} kg`
                  : 'Calculating...'
                }
              </div>
            </div>

            <div>
              <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Source URL</label>
              <input
                type="url"
                value={recipe.source_url || ''}
                onChange={(e) => setRecipe({ ...recipe, source_url: e.target.value })}
                className="input-field"
                style={{ width: '100%' }}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* ... (summary) ... */}
        </div>
        {/* ... (buttons) ... */}
      </div>

      {/* ... (orphans warning) ... */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="mobile-cols-1 mobile-gap-md">
        {/* Ingredients Column */}
        <div>
          <h3 className="mb-4">Ingredients</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recipe.ingredients.map((ing, idx) => (
              <div key={idx} className="card" style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={ing.name_normalized || ''}
                    onFocus={() => setFocusedIngredientName(ing.name_normalized || '')}
                    onChange={(e) => {
                      const newIngredients = [...recipe.ingredients];
                      newIngredients[idx] = { ...ing, name_normalized: e.target.value };
                      setRecipe({ ...recipe, ingredients: newIngredients });
                    }}
                    onBlur={(e) => handleRenameIngredient(idx, e.target.value)}
                    className="input-field"
                    style={{ width: '100%', marginBottom: '0.25rem' }}
                    placeholder="Ingredient name"
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: ing.is_to_taste ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={ing.is_to_taste || false}
                        onChange={(e) => {
                          const newIngredients = [...recipe.ingredients];
                          newIngredients[idx] = { ...ing, is_to_taste: e.target.checked };
                          setRecipe({ ...recipe, ingredients: newIngredients });
                        }}
                      />
                      to taste
                    </label>
                    {!ing.is_to_taste && (
                      <>
                        <input
                          type="number"
                          value={ing.base_quantity_g || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const newIngredients = [...recipe.ingredients];
                            newIngredients[idx] = { ...ing, base_quantity_g: val };
                            setRecipe({ ...recipe, ingredients: newIngredients });
                          }}
                          className="input-field"
                          style={{ 
                            width: '80px', 
                            fontSize: '0.875rem'
                          }}
                        />
                        <span className="text-muted" style={{ alignSelf: 'center', fontSize: '0.875rem' }}>g</span>
                      </>
                    )}
                    
                    <select
                      value={ing.role || 'CONSUMABLE'}
                      onChange={(e) => {
                        const newIngredients = [...recipe.ingredients];
                        newIngredients[idx] = { ...ing, role: e.target.value as any };
                        setRecipe({ ...recipe, ingredients: newIngredients });
                      }}
                      className="input-field"
                      style={{ flex: 1, fontSize: '0.875rem' }}
                    >
                      <option value="CONSUMABLE">Consumable</option>
                      <option value="PROCESS_ONLY">Process Only</option>
                      <option value="REDUCTION">Reduction</option>
                    </select>
                  </div>
                </div>
                {/* ... (remove button) ... */}
              </div>
            ))}
            {/* Add Ingredient Button */}
            <button
              onClick={() => {
                const newIngredient: StagingIngredient = {
                  id: crypto.randomUUID(),
                  name_raw: '',
                  name_normalized: '',
                  base_quantity_g: 0,
                  role: 'CONSUMABLE',
                  yield_factor: 1,
                  is_discrete: false,
                  dependency_role: 'PASSENGER',
                  density_confidence: 'high',
                  needs_review: false,
                  is_to_taste: false
                };
                setRecipe({
                  ...recipe,
                  ingredients: [...recipe.ingredients, newIngredient]
                });
              }}
              className="btn btn-secondary w-full touch-target"
              style={{ borderStyle: 'dashed' }}
            >
              + Add Ingredient
            </button>
          </div>
        </div>

        {/* Steps Column */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Instructions</h3>
            <button 
              className="btn btn-secondary" 
              onClick={handlePolishSteps}
              disabled={isPolishing}
            >
              {isPolishing ? '✨ Polishing...' : '✨ Polish Text'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recipe.steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ 
                  width: '24px', height: '24px', background: 'var(--color-primary)', color: 'white', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', flexShrink: 0, marginTop: '0.5rem'
                }}>
                  {idx + 1}
                </div>
                <textarea
                  value={step.instruction_raw}
                  onChange={(e) => handleStepTextChange(idx, e.target.value)}
                  className="input-field"
                  style={{ flex: 1, minHeight: '80px', resize: 'vertical' }}
                />
                <button 
                  onClick={() => {
                    const newSteps = recipe.steps.filter((_, i) => i !== idx);
                    setRecipe({ ...recipe, steps: newSteps });
                  }}
                  className="btn"
                  style={{ height: 'fit-content', padding: '0.25rem 0.5rem', color: '#ef4444', borderColor: '#ef4444', marginTop: '0.5rem' }}
                >
                  ×
                </button>
              </div>
            ))}
            <button 
              className="btn touch-target" 
              style={{ borderStyle: 'dashed' }}
              onClick={() => {
                setRecipe({
                  ...recipe,
                  steps: [...recipe.steps, {
                    id: crypto.randomUUID(),
                    order: recipe.steps.length + 1,
                    instruction_raw: '',
                    constraint_tags: []
                  }]
                });
              }}
            >
              + Add Step
            </button>
          </div>
        </div>
      </div>

      {/* Chef's Notes */}
      <div className="card mt-6" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Chef's Notes</h3>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setRecipe({
                ...recipe,
                chefs_notes: [...(recipe.chefs_notes || []), '']
              });
            }}
          >
            + Add Note
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(recipe.chefs_notes || []).map((note, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={note}
                onChange={(e) => {
                  const newNotes = [...(recipe.chefs_notes || [])];
                  newNotes[idx] = e.target.value;
                  setRecipe({ ...recipe, chefs_notes: newNotes });
                }}
                className="input-field"
                style={{ flex: 1 }}
                placeholder="Add a note..."
              />
              <button 
                onClick={() => {
                  const newNotes = (recipe.chefs_notes || []).filter((_, i) => i !== idx);
                  setRecipe({ ...recipe, chefs_notes: newNotes });
                }}
                className="btn"
                style={{ padding: '0.25rem 0.5rem', color: '#ef4444', borderColor: '#ef4444' }}
              >
                ×
              </button>
            </div>
          ))}
          {(recipe.chefs_notes || []).length === 0 && (
            <p className="text-muted">No notes yet.</p>
          )}
        </div>
      </div>
      
      {/* Desktop Footer Actions */}
      <div className="mobile-hide" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <div>
            <button 
              className="btn btn-secondary touch-target" 
              onClick={handleCopyText}
              title="Copy formatted recipe to clipboard"
            >
              {isCopied ? '✅ Copied!' : '📋 Copy as Text'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onCancel && (
              <button className="btn touch-target" onClick={onCancel}>Cancel</button>
            )}
            {onScaleExport && (
              <button 
                className="btn btn-secondary touch-target" 
                onClick={onScaleExport}
                disabled={isSaving || isCalculatingYield}
              >
                ⚖️ Scale & Export
              </button>
            )}
            <button 
              className="btn btn-primary touch-target" 
              onClick={() => onSave(recipe)}
              disabled={isSaving || isCalculatingYield}
            >
              {isSaving ? 'Saving...' : isCalculatingYield ? 'Calculating yield...' : saveLabel}
            </button>
          </div>
      </div>

      {/* Mobile Action Bar */}
      <div className="mobile-action-bar mobile-show">
        <button 
          className="btn btn-secondary touch-target" 
          onClick={handleCopyText}
        >
          {isCopied ? '✅' : '📋'}
        </button>
        {onScaleExport && (
          <button 
            className="btn btn-secondary touch-target" 
            onClick={onScaleExport}
            disabled={isSaving || isCalculatingYield}
          >
            ⚖️
          </button>
        )}
        <button 
          className="btn btn-primary touch-target" 
          onClick={() => onSave(recipe)}
          disabled={isSaving || isCalculatingYield}
          style={{ flex: 2 }}
        >
          {isSaving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </div>
  );
}
