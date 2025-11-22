'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Recipe {
  id: string;
  title: string;
  source_url: string | null;
  created_at: string;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecipes() {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('id, title, source_url, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRecipes(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecipes();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '50vh' }}>
        <p className="text-muted">Loading recipes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="mb-4">Error</h2>
        <p className="text-muted mb-4">{error}</p>
        <Link href="/staging" className="btn btn-primary">
          Ingest a Recipe
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Recipe Library</h1>
          <p className="text-muted">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} in the global library
          </p>
        </div>
        <Link href="/staging" className="btn btn-primary">
          + Ingest New
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2 className="mb-4">No recipes yet</h2>
          <p className="text-muted mb-6">
            Start by ingesting your first recipe from a URL or pasted text.
          </p>
          <Link href="/staging" className="btn btn-primary">
            Ingest Your First Recipe
          </Link>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
                <h3 className="mb-2">{recipe.title}</h3>
                {recipe.source_url && (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-muted"
                    style={{ fontSize: '0.875rem', display: 'block', marginBottom: '1rem' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Source ↗
                  </a>
                )}
                <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                  Added {new Date(recipe.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
