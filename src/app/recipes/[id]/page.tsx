'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useChili } from '@/context/ChiliContext';
import LoadingDumpling from '@/components/LoadingDumpling';

interface Recipe {
  id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  original_yield_servings: number | null;
  chefs_notes: string[];
  created_at: string;
  estimated_final_weight_g: number | null;
  yield_confidence: 'high' | 'medium' | 'low' | null;
  extraction_model: string | null;
  yield_estimation_model: string | null;
}

interface Ingredient {
  id: string;
  name_normalized: string;
  base_quantity_g: number;
  role: string;
  state: string | null;
}

interface Step {
  id: string;
  order: number;
  instruction_raw: string;
  constraint_tags: string[];
}

export default function RecipeDetailPage() {
  const params = useParams();
  const recipeId = params.id as string;
  const { isChiliMode } = useChili();
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchRecipe() {
      try {
        // Fetch recipe
        const { data: recipeData, error: recipeError } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', recipeId)
          .single();

        if (recipeError) throw recipeError;
        setRecipe(recipeData);

        // Fetch ingredients
        const { data: ingredientsData, error: ingredientsError } = await supabase
          .from('ingredients')
          .select('*')
          .eq('recipe_id', recipeId);

        if (ingredientsError) throw ingredientsError;
        setIngredients(ingredientsData || []);

        // Fetch steps
        const { data: stepsData, error: stepsError } = await supabase
          .from('steps')
          .select('*')
          .eq('recipe_id', recipeId)
          .order('order', { ascending: true });

        if (stepsError) throw stepsError;
        setSteps(stepsData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecipe();
  }, [recipeId]);

  const formatQuantity = (qty: number | null | undefined) => {
    if (qty === null || qty === undefined) return '—';
    const rounded = Math.round(qty * 10) / 10;
    return `${rounded.toLocaleString()} g`;
  };

  const confidenceClass =
    recipe?.yield_confidence === 'high'
      ? 'confidence-high'
      : recipe?.yield_confidence === 'medium'
        ? 'confidence-medium'
        : recipe?.yield_confidence === 'low'
          ? 'confidence-low'
          : 'confidence-unknown';

  const confidenceLabel = recipe?.yield_confidence
    ? `${recipe.yield_confidence.charAt(0).toUpperCase()}${recipe.yield_confidence.slice(1)} confidence`
    : 'Confidence unknown';

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '50vh' }}>
        <LoadingDumpling message="Steaming your recipe..." />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="mb-4">Error</h2>
        <p className="text-muted mb-4">{error || 'Recipe not found'}</p>
        <Link href="/recipes" className="btn btn-secondary">
          Back to Recipes
        </Link>
      </div>
    );
  }


  const handleCopyText = async () => {
    const lines = [];
    lines.push(recipe.title);
    if (recipe.summary) lines.push(recipe.summary);
    lines.push('');
    
    // Yield info
    lines.push(`Yield: ${recipe.original_yield_servings || '?'} servings`);
    if (recipe.estimated_final_weight_g) lines.push(`Total Weight: ${(recipe.estimated_final_weight_g / 1000).toFixed(2)} kg`);
    lines.push('');

    lines.push('Ingredients:');
    ingredients.forEach(ing => {
      const qty = ing.base_quantity_g ? ing.base_quantity_g.toFixed(1) : '';
      const name = ing.name_normalized;
      lines.push(`- ${qty}${qty ? 'g' : ''} ${name}`);
    });
    lines.push('');

    lines.push('Instructions:');
    steps.forEach((step, idx) => {
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

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${recipe?.title}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete recipe');
      }
      
      router.push('/recipes');
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete recipe: ' + err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="recipe-page">
      <div className="recipe-hero">
        <div>
          <div className="eyebrow">Recipe</div>
          <h1 className="recipe-hero-title">{recipe.title}</h1>
          {recipe.summary && <p className="recipe-hero-summary">{recipe.summary}</p>}
          <div className="recipe-hero-meta">
            <span className="pill pill-soft">{ingredients.length} ingredients</span>
            <span className="pill pill-soft">{steps.length} steps</span>
            {recipe.original_yield_servings && (
              <span className="pill pill-soft">Original yield: {recipe.original_yield_servings} servings</span>
            )}
            {recipe.source_url && (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="pill pill-ghost"
              >
                Source link ↗
              </a>
            )}
          </div>
        </div>

        <div className="recipe-hero-panel">
          <div className="hero-stat">
            <span className="stat-label">Estimated Final Weight</span>
            <div className="stat-value">
              {recipe.estimated_final_weight_g ? `~${recipe.estimated_final_weight_g.toLocaleString()} g` : 'Awaiting estimate'}
            </div>
            <div className="stat-meta">
              <span className={`confidence-chip ${confidenceClass}`}>
                <span className={`confidence-dot ${confidenceClass}`} />
                {confidenceLabel}
              </span>
              {recipe.original_yield_servings && (
                <span className="text-dim">Based on {recipe.original_yield_servings} servings</span>
              )}
            </div>
          </div>
          <div className="hero-actions mobile-stack mobile-gap-sm">
            <button 
              className="btn btn-secondary touch-target"
              onClick={handleCopyText}
              title="Copy formatted recipe to clipboard"
            >
              {isCopied ? '✅ Copied!' : '📋 Copy as text'}
            </button>
            <Link href={`/recipes/${recipe.id}/edit`} className="btn btn-primary touch-target">
              Edit recipe
            </Link>
            <button
              className="btn btn-danger touch-target"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : '🗑️ Delete'}
            </button>
          </div>
        </div>

        {/* Mobile iOS-style nav header */}
        <div className="ios-page-header mobile-show">
          <Link href="/recipes" className="ios-back-btn">
            ‹ Recipes
          </Link>
          <div className="ios-header-actions">
            <button
              className="ios-header-btn"
              onClick={() => setShowActionSheet(true)}
              aria-label="More actions"
            >
              •••
            </button>
            <Link href={`/recipes/${recipe.id}/edit`} className="ios-header-btn ios-header-edit">
              Edit
            </Link>
          </div>
        </div>

        {/* iOS Action Sheet */}
        {showActionSheet && (
          <>
            <div 
              className="ios-action-sheet-overlay"
              onClick={() => setShowActionSheet(false)}
            />
            <div className="ios-action-sheet">
              <div className="ios-action-sheet-group">
                <button
                  className="ios-action-sheet-btn"
                  onClick={() => {
                    handleCopyText();
                    setShowActionSheet(false);
                  }}
                >
                  {isCopied ? '✅ Copied!' : '📋 Copy as Text'}
                </button>
              </div>
              <div className="ios-action-sheet-group">
                <button
                  className="ios-action-sheet-btn ios-action-destructive"
                  onClick={() => {
                    setShowActionSheet(false);
                    handleDelete();
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : '🗑️ Delete Recipe'}
                </button>
              </div>
              <div className="ios-action-sheet-group">
                <button
                  className="ios-action-sheet-btn ios-action-cancel"
                  onClick={() => setShowActionSheet(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isChiliMode && (
        <div className="model-card">
          <div className="eyebrow">Chili debug</div>
          <div className="model-grid">
            <div className="model-pill">
              <span className="text-dim">Extraction</span>
              <strong>{recipe.extraction_model || 'Unknown'}</strong>
            </div>
            <div className="model-pill">
              <span className="text-dim">Yield model</span>
              <strong>{recipe.yield_estimation_model || 'Unknown'}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="recipe-meta-grid">
        <div className="meta-card">
          <span className="meta-label">Ingredients</span>
          <span className="meta-value">{ingredients.length}</span>
          <p className="meta-hint">Consumable + process-only entries.</p>
        </div>
        <div className="meta-card">
          <span className="meta-label">Instructions</span>
          <span className="meta-value">{steps.length}</span>
          <p className="meta-hint">Ordered steps ready to cook.</p>
        </div>
        <div className="meta-card">
          <span className="meta-label">Original yield</span>
          <span className="meta-value">{recipe.original_yield_servings ? `${recipe.original_yield_servings} servings` : 'Not provided'}</span>
          <p className="meta-hint">Baseline for scaling and shopping lists.</p>
        </div>
      </div>

      <div className="recipe-body">
        {/* Left Column: Ingredients */}
        <div className="card ingredients-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">Pantry</div>
              <h2>Ingredients</h2>
            </div>
            <div className="section-meta">
              <span className="pill pill-soft">{ingredients.length} items</span>
            </div>
          </div>
          {ingredients.length === 0 ? (
            <p className="text-muted">No ingredients found</p>
          ) : (
            <div className="ingredient-list">
              {ingredients.map((ing) => (
                <div key={ing.id} className="ingredient-item">
                  <div className="ingredient-main">
                    <div className="ingredient-name">{ing.name_normalized}</div>
                    <div className="ingredient-meta">
                      <span className="ingredient-tag">{ing.state || 'Unspecified'}</span>
                      <span className={`ingredient-tag ${ing.role?.toLowerCase() === 'consumable' ? 'tag-consumable' : 'tag-process'}`}>
                        {ing.role || 'Role not set'}
                      </span>
                    </div>
                  </div>
                  <div className="ingredient-qty">{formatQuantity(ing.base_quantity_g)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Steps */}
        <div className="card steps-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">Cook mode</div>
              <h2>Instructions</h2>
            </div>
            <div className="section-meta">
              <span className="pill pill-soft">{steps.length} steps</span>
            </div>
          </div>
          {steps.length === 0 ? (
            <p className="text-muted">No steps found</p>
          ) : (
            <ol className="step-list">
              {steps.map((step, idx) => (
                <li key={step.id} className="step-item">
                  <div className="step-number">{idx + 1}</div>
                  <div className="step-content">
                    <p className="step-text">{step.instruction_raw}</p>
                    {step.constraint_tags && step.constraint_tags.length > 0 && (
                      <div className="step-tags">
                        {step.constraint_tags.map((tag, tagIdx) => (
                          <span key={tagIdx} className="constraint-pill">
                            ⚠ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Chef's Notes */}
      {recipe.chefs_notes && recipe.chefs_notes.length > 0 && (
        <div className="card notes-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">Chef's notes</div>
              <h3>Tips for success</h3>
            </div>
          </div>
          <ul className="notes-list">
            {recipe.chefs_notes.map((note, idx) => (
              <li key={idx} className="note-line">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sticky Action Footer for Mobile */}
      <div className="recipe-actions-sticky mobile-show">
        <button 
          className="btn btn-secondary"
          onClick={handleCopyText}
        >
          {isCopied ? '✅ Copied' : '📋 Copy'}
        </button>
        <Link href={`/recipes/${recipe.id}/edit`} className="btn btn-primary">
          ✏️ Edit
        </Link>
      </div>
    </div>
  );
}
