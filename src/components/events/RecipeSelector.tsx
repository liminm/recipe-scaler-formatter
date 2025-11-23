import { useState } from 'react';

interface Recipe {
  id: string;
  title: string;
  original_yield_servings?: number;
  tags?: string[];
}

interface RecipeSelectorProps {
  recipes: Recipe[];
  onAddRecipe: (recipe: Recipe) => void;
}

export default function RecipeSelector({ 
  recipes, 
  onAddRecipe 
}: RecipeSelectorProps) {
  const [search, setSearch] = useState('');
  
  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <h3 className="mb-4">Recipe Library</h3>
      
      <input
        type="text"
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field mb-4"
      />
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredRecipes.map((recipe) => (
          <div
            key={recipe.id}
            className="card"
            style={{ 
              marginBottom: '0.75rem', 
              padding: '1rem',
              transition: 'all 0.2s'
            }}
          >
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', fontWeight: 600 }}>
              {recipe.title}
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {recipe.original_yield_servings && (
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {recipe.original_yield_servings} servings
                  </span>
                )}
                {recipe.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-muted"
                    style={{ fontSize: '0.75rem', opacity: 0.7 }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => onAddRecipe(recipe)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
              >
                + Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
