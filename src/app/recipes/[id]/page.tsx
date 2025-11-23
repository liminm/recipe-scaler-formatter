'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useDebug } from '@/context/DebugContext';
import LoadingDumpling from '@/components/LoadingDumpling';

interface Recipe {
  id: string;
  title: string;
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
  const router = useRouter();
  const { isDebugMode } = useDebug();
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '50vh' }}>
        <p className="text-muted">Loading recipe...</p>
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Link href="/recipes" className="text-muted" style={{ fontSize: '0.875rem' }}>
            ← Back to Recipes
          </Link>
          <Link href={`/recipes/${recipeId}/edit`}>
            <button className="btn btn-primary">✏️ Edit Recipe</button>
          </Link>
        </div>
        <h1 className="mb-2">{recipe.title}</h1>
        
        {/* Yield Estimate Display */}
        {recipe.estimated_final_weight_g && (
          <div style={{ 
            background: 'var(--color-surface)', 
            padding: '0.75rem 1rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1rem',
            border: '1px solid var(--color-border)',
            display: 'inline-flex',
            gap: '2rem',
            alignItems: 'center'
          }}>
            <div>
              <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                Estimated Final Weight
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                ~{recipe.estimated_final_weight_g}g
              </span>
              {recipe.yield_confidence && (
                <span style={{ marginLeft: '0.5rem', fontSize: '1rem' }}>
                  {recipe.yield_confidence === 'high' && '🟢'}
                  {recipe.yield_confidence === 'medium' && '🟡'}
                  {recipe.yield_confidence === 'low' && '🔴'}
                </span>
              )}
            </div>
          </div>
        )}

        {isDebugMode && (
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '0.5rem', 
            background: '#333', 
            color: '#0f0', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontFamily: 'monospace'
          }}>
            <div>🔧 <strong>Extraction Model:</strong> {recipe.extraction_model || 'Unknown'}</div>
            <div>🔧 <strong>Yield Model:</strong> {recipe.yield_estimation_model || 'Unknown'}</div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
              style={{ fontSize: '0.875rem' }}
            >
              View Source ↗
            </a>
          )}
          {recipe.original_yield_servings && (
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>
              Original Yield: {recipe.original_yield_servings} servings
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: Ingredients */}
        <div className="card">
          <h2 className="mb-4">Ingredients</h2>
          {ingredients.length === 0 ? (
            <p className="text-muted">No ingredients found</p>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-muted" style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.875rem' }}>Name</th>
                  <th className="text-muted" style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.875rem' }}>Qty (g)</th>
                  <th className="text-muted" style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.875rem' }}>State</th>
                  <th className="text-muted" style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.875rem' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => (
                  <tr key={ing.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{ing.name_normalized}</td>
                    <td className="text-mono" style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      {ing.base_quantity_g}
                    </td>
                    <td className="text-muted" style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem' }}>
                      {ing.state || '-'}
                    </td>
                    <td className="text-muted" style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem' }}>
                      {ing.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Column: Steps */}
        <div className="card">
          <h2 className="mb-4">Instructions</h2>
          {steps.length === 0 ? (
            <p className="text-muted">No steps found</p>
          ) : (
            <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
              {steps.map((step) => (
                <li key={step.id} style={{ marginBottom: '1.5rem' }}>
                  <p style={{ marginBottom: '0.5rem' }}>{step.instruction_raw}</p>
                  {step.constraint_tags && step.constraint_tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {step.constraint_tags.map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            background: 'var(--color-warning)',
                            color: '#000',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontWeight: 600
                          }}
                        >
                          ⚠ {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Chef's Notes */}
      {recipe.chefs_notes && recipe.chefs_notes.length > 0 && (
        <div className="card mt-6">
          <h3 className="mb-4">Chef's Notes</h3>
          <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
            {recipe.chefs_notes.map((note, idx) => (
              <li key={idx} className="text-muted" style={{ marginBottom: '0.5rem' }}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
