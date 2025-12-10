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
      {/* Mobile: Compact inline hero */}
      <div className="library-hero-inline mobile-show">
        <div className="hero-left">
          <h1>Recipes</h1>
          <span className="hero-count">{stats.total}</span>
        </div>
        <Link href="/staging" className="btn btn-primary btn-sm">
          + New
        </Link>
      </div>

      {/* Desktop: Full hero */}
      <div className="library-hero mobile-hide">
        <div>
          <p className="eyebrow">Global library</p>
          <div className="hero-heading">
            <h1>Recipe Library</h1>
            <span className="badge subtle">Fresh every ingest</span>
          </div>
          <p className="text-muted library-desc">
            Discover, browse, and reuse every recipe captured across events. All recipes stay in metric with consistent
            ingredient parsing.
          </p>
          <div className="hero-stats">
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

      <div className="library-controls-row">
        <div className="search-wrap">
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <span className="search-icon">🔍</span>
          <input
            id="recipe-search"
            className="input-field search-input"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <button
            type="button"
            className={`chip chip-sm ${withSourceOnly ? 'chip-active' : ''}`}
            onClick={() => setWithSourceOnly((v) => !v)}
          >
            Source
          </button>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="input-field sort-select-sm"
          >
            <option value="newest">New</option>
            <option value="oldest">Old</option>
          </select>
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
                <div className="card-header">
                  <h3 className="recipe-card-title">{recipe.title}</h3>
                  <span className="card-date">{formatDate(recipe.created_at)}</span>
                </div>
                {recipe.summary && <p className="recipe-card-summary">{recipe.summary}</p>}
                {domain && (
                  <div className="card-footer">
                    <span className="source-badge">{domain} ↗</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
