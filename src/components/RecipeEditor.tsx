'use client';

import { useState, useEffect } from 'react';
import { StagingRecipe, StagingIngredient, StagingStep } from '@/types/staging';
import { estimateYield } from '@/services/ingestion/yieldCalculator';

interface RecipeEditorProps {
  recipe: StagingRecipe;
  onSave: (recipe: StagingRecipe) => void;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
}

export default function RecipeEditor({ 
  recipe: initialRecipe, 
  onSave, 
  onCancel,
  isSaving = false,
  saveLabel = 'Save Recipe'
}: RecipeEditorProps) {
  const [recipe, setRecipe] = useState<StagingRecipe>(initialRecipe);
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [focusedIngredientName, setFocusedIngredientName] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  
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

  // Update local state if prop changes
  useEffect(() => {
    setRecipe(initialRecipe);
  }, [initialRecipe]);

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
    
    const timeoutId = setTimeout(async () => {
      try {
        const yieldEstimate = await estimateYield(recipe.ingredients, recipe.steps);
        setRecipe(prev => ({
          ...prev,
          estimated_final_weight_g: yieldEstimate.estimatedFinalWeight_g,
          yield_confidence: yieldEstimate.confidence
        }));
      } catch (error) {
        console.error('Auto-recalculate yield failed:', error);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [recipe.ingredients, recipe.steps]);

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
    <div className="card">
      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%' }}>
            <h3>{confirmDialog.title}</h3>
            <p className="my-4">{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmDialog(null)}>Cancel</button>
              {confirmDialog.alternativeText && (
                <button className="btn btn-secondary" onClick={confirmDialog.onAlternative}>
                  {confirmDialog.alternativeText}
                </button>
              )}
              <button className="btn btn-primary" onClick={confirmDialog.onConfirm}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <input
            type="text"
            value={recipe.title}
            onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
            className="input-field"
            style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '100%' }}
          />
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Estimated Yield: {recipe.estimated_final_weight_g ? `${(recipe.estimated_final_weight_g / 1000).toFixed(2)} kg` : 'Calculating...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {onCancel && (
            <button className="btn" onClick={onCancel}>Cancel</button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={() => onSave(recipe)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : saveLabel}
          </button>
        </div>
      </div>

      {ingredientSuggestions.length > 0 && (
        <div className="alert alert-warning mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <strong>Warning:</strong> {ingredientSuggestions.length} ingredients found in list but not mentioned in steps.
          </span>
          <button 
            className="btn btn-sm"
            style={{ background: 'rgba(0,0,0,0.1)', border: 'none' }}
            onClick={removeOrphanedIngredients}
          >
            Remove All Orphans
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
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
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      value={ing.base_quantity_g || 0}
                      onChange={(e) => {
                        const newIngredients = [...recipe.ingredients];
                        newIngredients[idx] = { ...ing, base_quantity_g: Number(e.target.value) };
                        setRecipe({ ...recipe, ingredients: newIngredients });
                      }}
                      className="input-field"
                      style={{ width: '80px', fontSize: '0.875rem' }}
                    />
                    <span className="text-muted" style={{ alignSelf: 'center', fontSize: '0.875rem' }}>g</span>
                    
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
                <button 
                  onClick={() => handleRemoveIngredient(idx)}
                  className="btn"
                  style={{ padding: '0.25rem 0.5rem', color: '#ef4444', borderColor: '#ef4444' }}
                  title="Remove ingredient"
                >
                  ×
                </button>
              </div>
            ))}
            <button 
              className="btn" 
              style={{ borderStyle: 'dashed' }}
              onClick={() => {
                setRecipe({
                  ...recipe,
                  ingredients: [...recipe.ingredients, {
                    id: crypto.randomUUID(),
                    name_raw: '',
                    name_normalized: '',
                    base_quantity_g: 0,
                    role: 'CONSUMABLE',
                    yield_factor: 1,
                    is_discrete: false,
                    dependency_role: 'PASSENGER',
                    density_confidence: 'high',
                    needs_review: false
                  }]
                });
              }}
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
              className="btn" 
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
    </div>
  );
}
