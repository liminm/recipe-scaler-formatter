'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingDumpling from '@/components/LoadingDumpling';
import { estimateYield } from '@/services/ingestion/yieldCalculator';
import { useDebug } from '@/context/DebugContext';

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams();
  const recipeId = params.id as string;
  const { isDebugMode } = useDebug();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Smart features state
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [focusedIngredientName, setFocusedIngredientName] = useState<string | null>(null);
  const [hoveredIngredient, setHoveredIngredient] = useState<{ name: string; rawName?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onAlternative?: () => void;
    confirmText: string;
    alternativeText?: string;
  } | null>(null);

  // Helper functions from StagingFlow
  const getSearchTerms = (name: string): string[] => {
    return name
      .toLowerCase()
      .replace(/[()[\]]/g, '')
      .split(/[\s,]+/)
      .filter(term => term.length >= 3);
  };

  const isIngredientMentioned = (ingredientName: string, text: string, rawName?: string): boolean => {
    const lowerText = text.toLowerCase();
    const normalizedLower = ingredientName.toLowerCase();
    
    if (lowerText.includes(normalizedLower)) return true;
    
    if (rawName && rawName !== ingredientName) {
      const rawLower = rawName.toLowerCase();
      if (lowerText.includes(rawLower)) return true;
    }
    
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

  const findStepsMentioning = (ingredientName: string, rawName?: string): number[] => {
    return steps
      .map((step, idx) => ({ step, idx }))
      .filter(({ step }) => isIngredientMentioned(ingredientName, step.instruction_raw, rawName))
      .map(({ idx }) => idx);
  };

  const getOrphanedIngredients = (): string[] => {
    const allStepsText = steps.map(s => s.instruction_raw).join(' ');
    
    return ingredients
      .filter(ing => {
        const name = ing.name_normalized;
        if (!name) return false;
        return !isIngredientMentioned(name, allStepsText, ing.name_raw);
      })
      .map(ing => ing.name_normalized!)
      .filter(Boolean);
  };

  const checkForOrphanedAfterEdit = (currentSteps?: any[]) => {
    const stepsToCheck = currentSteps || steps;
    const allStepsText = stepsToCheck.map(s => s.instruction_raw).join(' ');
    
    const orphaned = ingredients
      .filter(ing => {
        const name = ing.name_normalized;
        if (!name) return false;
        return !isIngredientMentioned(name, allStepsText, ing.name_raw);
      })
      .map(ing => ing.name_normalized!)
      .filter(Boolean);
    
    setIngredientSuggestions(orphaned);
  };

  const handleRemoveIngredient = (idx: number) => {
    const ingredient = ingredients[idx];
    const ingredientName = ingredient.name_normalized || '';
    
    if (!ingredientName) {
      setIngredients(ingredients.filter((_, i) => i !== idx));
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
          const updatedSteps = steps.map(step => {
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
              if (!namesToRemove.includes(term)) {
                namesToRemove.push(term);
              }
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
            
            return {
              ...step,
              instruction_raw: cleaned
            };
          });
          
          setIngredients(ingredients.filter((_, i) => i !== idx));
          setSteps(updatedSteps);
          setConfirmDialog(null);
        },
        onAlternative: () => {
          setIngredients(ingredients.filter((_, i) => i !== idx));
          setConfirmDialog(null);
        }
      });
    } else {
      setIngredients(ingredients.filter((_, i) => i !== idx));
    }
  };

  const handleRenameIngredient = (idx: number, newName: string) => {
    if (!focusedIngredientName || focusedIngredientName === newName) return;
    
    const oldName = focusedIngredientName;
    const ingredient = ingredients[idx];
    
    const affectedStepIndices = findStepsMentioning(oldName, ingredient.name_raw);
    
    if (affectedStepIndices.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Update Step Instructions?',
        message: `You renamed "${oldName}" to "${newName}". Should we update the ${affectedStepIndices.length} step(s) that mention it?`,
        confirmText: 'Yes, Update Steps',
        alternativeText: 'No, Just Rename Ingredient',
        onConfirm: () => {
          const updatedSteps = steps.map(step => {
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
            
            return {
              ...step,
              instruction_raw: updatedText
            };
          });
          
          setSteps(updatedSteps);
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

  const handleStepTextChange = (idx: number, newText: string) => {
    const updatedSteps = [...steps];
    updatedSteps[idx] = { ...updatedSteps[idx], instruction_raw: newText };
    setSteps(updatedSteps);
    checkForOrphanedAfterEdit(updatedSteps);
  };

  const removeOrphanedIngredients = () => {
    setIngredients(ingredients.filter(ing => 
      !ingredientSuggestions.includes(ing.name_normalized || '')
    ));
    setIngredientSuggestions([]);
  };

  const handlePolishSteps = async () => {
    setSaving(true);
    try {
      const stepsText = steps.map(s => s.instruction_raw);
      
      const res = await fetch('/api/ingest/polish', {
        method: 'POST',
        body: JSON.stringify({ steps: stepsText }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const polishedSteps = data.polishedSteps as string[];
      
      if (polishedSteps.length !== steps.length) {
        throw new Error('Mismatch in number of steps returned');
      }
      
      const updatedSteps = steps.map((step, idx) => ({
        ...step,
        instruction_raw: polishedSteps[idx]
      }));
      
      setSteps(updatedSteps);
      checkForOrphanedAfterEdit(updatedSteps);
      
    } catch (error: any) {
      alert(`Failed to polish steps: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculateYield = async () => {
    setSaving(true);
    try {
      const yieldEstimate = await estimateYield(ingredients, steps);
      setRecipe({
        ...recipe,
        estimated_final_weight_g: yieldEstimate.estimatedFinalWeight_g,
        yield_confidence: yieldEstimate.confidence
      });
      alert(`Yield recalculated: ~${yieldEstimate.estimatedFinalWeight_g}g (${yieldEstimate.confidence} confidence)`);
    } catch (error: any) {
      alert(`Failed to recalculate yield: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Auto-recalculate yield when ingredients or steps change (debounced)
  useEffect(() => {
    if (!recipe || ingredients.length === 0) return;
    
    // Debounce: wait 2 seconds after last change before recalculating
    const timeoutId = setTimeout(async () => {
      try {
        const yieldEstimate = await estimateYield(ingredients, steps);
        setRecipe((prev: any) => ({
          ...prev,
          estimated_final_weight_g: yieldEstimate.estimatedFinalWeight_g,
          yield_confidence: yieldEstimate.confidence
        }));
      } catch (error) {
        console.error('Auto-recalculate yield failed:', error);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [ingredients, steps]); // Recalculate when ingredients or steps change

  useEffect(() => {
    if (!recipeId) return;
    
    const fetchRecipe = async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to load recipe');
        
        setRecipe(data.recipe);
        setIngredients(data.ingredients || []);
        setSteps(data.steps || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId]);

  const handleSave = async () => {
    if (!recipe) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe,
          ingredients,
          steps
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      
      alert('Recipe updated successfully!');
      router.push('/recipes');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingDumpling message="Loading recipe..." size="medium" />;
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <h2 className="mb-4">Error</h2>
        <p className="text-muted mb-4">{error}</p>
        <button className="btn btn-primary" onClick={() => router.push('/recipes')}>
          Back to Recipes
        </button>
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Edit Recipe</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn" 
            onClick={() => router.push('/recipes')}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

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

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 className="mb-4">Recipe Details</h3>
        <div style={{ marginBottom: '1rem' }}>
          <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Title</label>
          <input
            type="text"
            value={recipe.title}
            onChange={e => setRecipe({ ...recipe, title: e.target.value })}
            className="input-field"
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Source URL</label>
          <input
            type="url"
            value={recipe.source_url || ''}
            onChange={e => setRecipe({ ...recipe, source_url: e.target.value })}
            className="input-field"
            style={{ width: '100%' }}
            placeholder="https://example.com/recipe"
          />
        </div>
        <div>
          <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Original Yield (servings)</label>
          <input
            type="number"
            value={recipe.original_yield_servings || ''}
            onChange={e => setRecipe({ ...recipe, original_yield_servings: parseInt(e.target.value) || null })}
            className="input-field"
            style={{ width: '200px' }}
            placeholder="e.g., 4"
          />
        </div>
        
        {/* Yield Estimate Section */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Estimated Final Weight</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  value={recipe.estimated_final_weight_g || ''}
                  onChange={e => setRecipe({ ...recipe, estimated_final_weight_g: parseFloat(e.target.value) || null })}
                  className="input-field"
                  style={{ width: '150px' }}
                  placeholder="grams"
                />
                <span className="text-muted">g</span>
                {recipe.yield_confidence && (
                  <span style={{ fontSize: '1.25rem' }} title={`Confidence: ${recipe.yield_confidence}`}>
                    {recipe.yield_confidence === 'high' && '🟢'}
                    {recipe.yield_confidence === 'medium' && '🟡'}
                    {recipe.yield_confidence === 'low' && '🔴'}
                  </span>
                )}
              </div>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Manual override: edit the value above to set a custom weight
              </p>
              
              {isDebugMode && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem', 
                  background: '#333', 
                  color: '#0f0', 
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}>
                  <div>🔧 <strong>Extraction:</strong> {recipe.extraction_model || 'Unknown'}</div>
                  <div>🔧 <strong>Yield Est:</strong> {recipe.yield_estimation_model || 'Unknown'}</div>
                </div>
              )}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRecalculateYield}
              disabled={saving || ingredients.length === 0}
              style={{ marginTop: '1.5rem' }}
            >
              🔄 Recalculate Yield
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Ingredients</h3>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setIngredients([...ingredients, {
                id: crypto.randomUUID(),
                name_normalized: '',
                name_raw: '',
                base_quantity_g: 0,
                state: 'fresh',
                role: 'CONSUMABLE',
                dependency_role: 'PASSENGER',
                yield_factor: 1,
                is_discrete: false
              }]);
            }}
          >
            + Add Ingredient
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ingredients.map((ing, idx) => (
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
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Ingredient name"
                  value={ing.name_normalized}
                  onChange={e => {
                    const newIngredients = [...ingredients];
                    newIngredients[idx] = { ...ing, name_normalized: e.target.value };
                    setIngredients(newIngredients);
                  }}
                  onFocus={() => setFocusedIngredientName(ing.name_normalized || '')}
                  onBlur={(e) => handleRenameIngredient(idx, e.target.value)}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder="Qty (g)"
                  value={ing.base_quantity_g || ''}
                  onChange={e => {
                    const newIngredients = [...ingredients];
                    newIngredients[idx] = { ...ing, base_quantity_g: parseFloat(e.target.value) || 0 };
                    setIngredients(newIngredients);
                  }}
                  className="input-field"
                />
                <select
                  value={ing.state || 'fresh'}
                  onChange={e => {
                    const newIngredients = [...ingredients];
                    newIngredients[idx] = { ...ing, state: e.target.value };
                    setIngredients(newIngredients);
                  }}
                  className="input-field"
                >
                  <option value="fresh">Fresh</option>
                  <option value="canned">Canned</option>
                  <option value="dry">Dry</option>
                  <option value="frozen">Frozen</option>
                  <option value="pre-cooked">Pre-cooked</option>
                </select>
                <button
                  className="btn btn-sm"
                  onClick={() => handleRemoveIngredient(idx)}
                  style={{ padding: '0.5rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Steps</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePolishSteps}
              disabled={saving}
            >
              ✨ Polish with AI
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSteps([...steps, {
                  id: crypto.randomUUID(),
                  order: steps.length,
                  instruction_raw: '',
                  constraint_tags: []
                }]);
              }}
            >
              + Add Step
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {steps.map((step, idx) => {
            const isHighlighted = hoveredIngredient && 
              isIngredientMentioned(hoveredIngredient.name, step.instruction_raw, hoveredIngredient.rawName);
            
            return (
              <div 
                key={step.id} 
                className="card" 
                style={{ 
                  padding: '0.75rem',
                  border: isHighlighted ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ 
                    minWidth: '2rem', 
                    height: '2rem', 
                    borderRadius: '50%', 
                    background: 'var(--color-primary)', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <textarea
                    rows={3}
                    value={step.instruction_raw}
                    onChange={e => handleStepTextChange(idx, e.target.value)}
                    className="input-field"
                    style={{ flex: 1 }}
                    placeholder="Describe this step..."
                  />
                  <button
                    className="btn btn-sm"
                    onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                    style={{ padding: '0.5rem', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
