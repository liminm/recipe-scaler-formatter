'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Recipe {
  id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  created_at: string;
}

type SortOrder = 'newest' | 'oldest';

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(dateString)
  );

const getDomain = (url: string | null) => {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    return null;
  }
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [withSourceOnly, setWithSourceOnly] = useState(false);

  useEffect(() => {
    async function fetchRecipes() {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('id, title, summary, source_url, created_at')
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

  const stats = useMemo(() => {
    const withSource = recipes.filter((r) => !!r.source_url).length;
    const domains = new Set(
      recipes
        .map((r) => getDomain(r.source_url))
        .filter((d): d is string => Boolean(d))
    );
    return { total: recipes.length, withSource, domains: domains.size };
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = (recipe: Recipe) => {
      if (!normalized) return true;
      const haystack = `${recipe.title} ${recipe.summary || ''}`.toLowerCase();
      return haystack.includes(normalized);
    };

    const filtered = recipes.filter((r) => matches(r) && (!withSourceOnly || !!r.source_url));

    return filtered.sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [recipes, query, sortOrder, withSourceOnly]);

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '50vh' }}>
        <p className="text-muted">Loading recipes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 className="mb-4">Error</h2>
        <p className="text-muted mb-4">{error}</p>
        <Link href="/staging" className="btn btn-primary">
          Ingest a Recipe
        </Link>
      </div>
    );
  }

  return (
    <div className="library-layout">
      <div className="library-hero">
        <div>
          <p className="eyebrow">Global library</p>
          <div className="hero-heading">
            <h1>Recipe Library</h1>
            <span className="badge subtle">Fresh every ingest</span>
          </div>
          <p className="text-muted">
            Discover, browse, and reuse every recipe captured across events. All recipes stay in metric with consistent
            ingredient parsing.
          </p>
          <div className="hero-stats mobile-cols-2 mobile-gap-sm">
            <div className="stat-card">
              <p className="text-muted">Total recipes</p>
              <strong>{stats.total}</strong>
            </div>
            <div className="stat-card">
              <p className="text-muted">With source links</p>
              <strong>{stats.withSource}</strong>
            </div>
            <div className="stat-card">
              <p className="text-muted">Unique sources</p>
              <strong>{stats.domains}</strong>
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <Link href="/staging" className="btn btn-primary">
            + Ingest New
          </Link>
        </div>
      </div>

      <div className="library-controls">
        <div className="search-wrap">
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <input
            id="recipe-search"
            className="input-field"
            placeholder="Search titles or notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="controls-row mobile-stack mobile-gap-sm">
          <div className="filter-chips">
            <button
              type="button"
              className={`chip ${withSourceOnly ? 'chip-active' : ''}`}
              onClick={() => setWithSourceOnly((v) => !v)}
            >
              Has source link
            </button>
          </div>
          <div className="sort-control">
            <label htmlFor="sort-order" className="text-muted">
              Sort
            </label>
            <select
              id="sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="input-field sort-select"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="card empty-card">
          <div>
            <p className="eyebrow">No matches</p>
            <h2 className="mb-4">Nothing here yet</h2>
            <p className="text-muted mb-4">Try adjusting your search or ingest a new recipe from a URL.</p>
            <Link href="/staging" className="btn btn-primary">
              Ingest a Recipe
            </Link>
          </div>
        </div>
      ) : (
        <div className="recipe-grid mobile-cols-1">
          {filteredRecipes.map((recipe) => {
            const domain = getDomain(recipe.source_url);
            return (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="recipe-card">
                <div className="card-top">
                  <span className="badge">{domain || 'Manual entry'}</span>
                  <span className="pill">{formatDate(recipe.created_at)}</span>
                </div>
                <h3 className="mb-2">{recipe.title}</h3>
                {recipe.summary && <p className="text-muted line-clamp-2">{recipe.summary}</p>}
                <div className="card-footer">
                  {recipe.source_url ? (
                    <span className="text-primary meta">View source ↗</span>
                  ) : (
                    <span className="text-dim meta">No source link</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
