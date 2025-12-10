'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

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

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"?\n\nThis cannot be undone.`);
    if (!confirmed) return;
    
    setDeletingId(id);
    try {
      const response = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setRecipes(prev => prev.filter(r => r.id !== id));
      setSwipedId(null);
    } catch (err) {
      alert('Failed to delete recipe');
    } finally {
      setDeletingId(null);
    }
  };

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
      {/* Mobile: iOS-style large title */}
      <div className="ios-title-section mobile-show">
        <h1 className="ios-large-title">Recipes</h1>
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

      {/* iOS-style search bar with sort - MOBILE ONLY */}
      <div className="ios-search-section mobile-show">
        <div className="ios-controls-row">
          <div className="ios-search-bar">
            <span className="search-icon">🔍</span>
            <input
              id="recipe-search"
              className="ios-search-input"
              placeholder={`Search ${stats.total} recipes`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ios-segment-control">
            <button
              type="button"
              className={`segment ${sortOrder === 'newest' ? 'active' : ''}`}
              onClick={() => setSortOrder('newest')}
            >
              Newest
            </button>
            <button
              type="button"
              className={`segment ${sortOrder === 'oldest' ? 'active' : ''}`}
              onClick={() => setSortOrder('oldest')}
            >
              Oldest
            </button>
          </div>
        </div>
      </div>

      {/* Desktop controls - HIDDEN ON MOBILE */}
      <div className="library-controls-row mobile-hide">
        <div className="search-wrap">
          <label htmlFor="recipe-search-desktop" className="sr-only">
            Search recipes
          </label>
          <span className="search-icon">🔍</span>
          <input
            id="recipe-search-desktop"
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
        <div className="ios-grouped-list mobile-show">
          {filteredRecipes.map((recipe, idx) => {
            const domain = getDomain(recipe.source_url);
            const isLast = idx === filteredRecipes.length - 1;
            const isSwiped = swipedId === recipe.id;
            const isDeleting = deletingId === recipe.id;
            
            return (
              <div 
                key={recipe.id} 
                className={`ios-swipe-container ${isSwiped ? 'swiped' : ''} ${isLast ? 'last' : ''}`}
                onClick={() => isSwiped && setSwipedId(null)}
              >
                <Link 
                  href={`/recipes/${recipe.id}`} 
                  className="ios-list-cell"
                  onClick={(e) => {
                    if (isSwiped) {
                      e.preventDefault();
                      setSwipedId(null);
                    }
                  }}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    (e.currentTarget as any)._startX = touch.clientX;
                  }}
                  onTouchEnd={(e) => {
                    const startX = (e.currentTarget as any)._startX;
                    const endX = e.changedTouches[0].clientX;
                    const diff = startX - endX;
                    if (diff > 50) {
                      e.preventDefault();
                      setSwipedId(recipe.id);
                    } else if (diff < -30 && isSwiped) {
                      setSwipedId(null);
                    }
                  }}
                >
                  <div className="cell-content">
                    <div className="cell-main">
                      <h3 className="cell-title">{recipe.title}</h3>
                      {recipe.summary && <p className="cell-subtitle">{recipe.summary}</p>}
                      {domain && <span className="cell-badge">{domain}</span>}
                    </div>
                    <div className="cell-accessory">
                      <span className="cell-date">{formatDate(recipe.created_at)}</span>
                      <span className="chevron">›</span>
                    </div>
                  </div>
                </Link>
                <button 
                  className="swipe-delete-btn"
                  onClick={() => handleDelete(recipe.id, recipe.title)}
                  disabled={isDeleting}
                >
                  {isDeleting ? '...' : 'Delete'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop grid - keep existing */}
      <div className="recipe-grid mobile-hide">
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
    </div>
  );
}
