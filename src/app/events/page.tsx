'use client';

import { useState } from 'react';

// Types
interface Recipe {
  id: string;
  title: string;
  original_yield_servings: number;
  tags: string[];
}

interface MenuRecipe {
  recipeId: string;
  title: string;
  role: 'Main' | 'Side' | 'Filler' | 'Dessert';
  targetPercentage: number;
  scaledMass: number;
  scaleFactor: number;
}

interface Ingredient {
  name: string;
  quantity: number;
  role: string;
  isHighPotency: boolean;
}

interface Warning {
  type: 'crowding' | 'temperature' | 'deficit';
  message: string;
}

// Mock Data
const MOCK_RECIPES: Recipe[] = [
  { id: '1', title: 'Sopaipillas chilenas fritas', original_yield_servings: 10, tags: ['Vegetarian', 'Chilean'] },
  { id: '2', title: 'Hawaiian Chicken Salad', original_yield_servings: 8, tags: ['Main', 'Protein'] },
  { id: '3', title: 'Slow Cooker Beef Stroganoff Stew', original_yield_servings: 6, tags: ['Main', 'Beef'] },
  { id: '4', title: 'Gingerbread Pear and Apple Parfait', original_yield_servings: 10, tags: ['Dessert', 'Vegetarian'] },
];

const MOCK_INGREDIENTS: Ingredient[] = [
  { name: 'Greek yogurt', quantity: 6500, role: 'Main', isHighPotency: false },
  { name: 'Maple syrup', quantity: 250, role: 'Seasoning', isHighPotency: false },
  { name: 'Ground cinnamon', quantity: 15, role: 'Seasoning', isHighPotency: true },
  { name: 'Salt', quantity: 45, role: 'Seasoning', isHighPotency: true },
  { name: 'Chicken breast', quantity: 4200, role: 'Main', isHighPotency: false },
];

const MOCK_WARNINGS: Warning[] = [
  { type: 'crowding', message: 'Oven crowding: 3 dishes require 200°C simultaneously' },
  { type: 'deficit', message: 'Deficit: Target 15kg, current menu provides 12.8kg' },
];

// Components
function EventHeader({ 
  eventName, 
  headcount, 
  targetMass, 
  dietaryTags,
  onEventNameChange,
  onHeadcountChange,
  onTargetMassChange 
}: {
  eventName: string;
  headcount: number;
  targetMass: number;
  dietaryTags: string[];
  onEventNameChange: (name: string) => void;
  onHeadcountChange: (count: number) => void;
  onTargetMassChange: (mass: number) => void;
}) {
  return (
    <div className="card mb-6">
      <input
        type="text"
        value={eventName}
        onChange={(e) => onEventNameChange(e.target.value)}
        className="input-field mb-4"
        style={{ fontSize: '1.5rem', fontWeight: 700, background: 'transparent', border: 'none', padding: '0.5rem 0' }}
        placeholder="Event Name"
      />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
            Headcount
          </label>
          <input
            type="number"
            value={headcount}
            onChange={(e) => onHeadcountChange(Number(e.target.value))}
            className="input-field"
            min="1"
          />
          <p className="text-dim" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Serving {headcount} people
          </p>
        </div>
        
        <div>
          <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
            Target Weight Per Person
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="number"
              value={targetMass}
              onChange={(e) => onTargetMassChange(Number(e.target.value))}
              className="input-field"
              min="100"
              step="50"
            />
            <span className="text-muted">g</span>
          </div>
          <p className="text-dim" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Total target: {((headcount * targetMass) / 1000).toFixed(1)} kg
          </p>
        </div>
      </div>
      
      {dietaryTags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {dietaryTags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.75rem',
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                fontWeight: 500
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeSelector({ 
  recipes, 
  onAddRecipe 
}: { 
  recipes: Recipe[]; 
  onAddRecipe: (recipe: Recipe) => void;
}) {
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
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', fontWeight: 600 }}>
              {recipe.title}
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="text-dim" style={{ fontSize: '0.75rem' }}>
                  {recipe.original_yield_servings} servings
                </span>
                {recipe.tags.map((tag) => (
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

function MenuBuilder({ 
  menuRecipes, 
  onRemoveRecipe,
  onUpdateRole,
  onUpdatePercentage 
}: {
  menuRecipes: MenuRecipe[];
  onRemoveRecipe: (recipeId: string) => void;
  onUpdateRole: (recipeId: string, role: MenuRecipe['role']) => void;
  onUpdatePercentage: (recipeId: string, percentage: number) => void;
}) {
  const totalPercentage = menuRecipes.reduce((sum, r) => sum + r.targetPercentage, 0);
  
  return (
    <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Current Menu</h3>
        <span className="text-mono" style={{ fontSize: '0.875rem', color: totalPercentage > 100 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
          {totalPercentage}%
        </span>
      </div>
      
      {menuRecipes.length === 0 ? (
        <div className="flex-center" style={{ flex: 1, textAlign: 'center' }}>
          <p className="text-muted">No recipes in menu yet. Add recipes from the library on the left.</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {menuRecipes.map((recipe) => (
            <div
              key={recipe.recipeId}
              className="card"
              style={{ marginBottom: '0.75rem', padding: '1rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, flex: 1 }}>
                  {recipe.title}
                </h4>
                <button
                  onClick={() => onRemoveRecipe(recipe.recipeId)}
                  className="btn"
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  × Remove
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                    Role
                  </label>
                  <select
                    value={recipe.role}
                    onChange={(e) => onUpdateRole(recipe.recipeId, e.target.value as MenuRecipe['role'])}
                    className="input-field"
                    style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                  >
                    <option value="Main">Main</option>
                    <option value="Side">Side</option>
                    <option value="Filler">Filler</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                    Target %
                  </label>
                  <input
                    type="number"
                    value={recipe.targetPercentage}
                    onChange={(e) => onUpdatePercentage(recipe.recipeId, Number(e.target.value))}
                    className="input-field"
                    style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span className="text-dim">Scale factor: {recipe.scaleFactor.toFixed(2)}×</span>
                <span className="text-mono text-muted">{(recipe.scaledMass / 1000).toFixed(2)} kg</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConstraintWarnings({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;
  
  return (
    <div className="card mb-6">
      <h3 className="mb-4">Warnings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {warnings.map((warning, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'start',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <span style={{ fontSize: '1.25rem', color: 'var(--color-warning)' }}>⚠</span>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', flex: 1 }}>
              {warning.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScaledIngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <div className="card">
      <h3 className="mb-4">Scaled Ingredient List</h3>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th className="text-muted" style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600 }}>
              Ingredient
            </th>
            <th className="text-muted" style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600 }}>
              Quantity
            </th>
            <th className="text-muted" style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600 }}>
              Role
            </th>
            <th className="text-muted" style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
              Warning
            </th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '0.75rem' }}>{ing.name}</td>
              <td className="text-mono" style={{ padding: '0.75rem', textAlign: 'right' }}>
                {ing.quantity >= 1000 ? `${(ing.quantity / 1000).toFixed(2)} kg` : `${ing.quantity} g`}
              </td>
              <td className="text-muted" style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                {ing.role}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                {ing.isHighPotency && (
                  <span style={{ fontSize: '0.75rem', background: 'var(--color-warning)', color: '#000', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                    High Potency
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main Component
export default function EventPage() {
  const [eventName, setEventName] = useState('Weekend Catering Event');
  const [headcount, setHeadcount] = useState(30);
  const [targetMass, setTargetMass] = useState(500);
  const [menuRecipes, setMenuRecipes] = useState<MenuRecipe[]>([
    {
      recipeId: '4',
      title: 'Gingerbread Pear and Apple Parfait',
      role: 'Dessert',
      targetPercentage: 20,
      scaledMass: 3000,
      scaleFactor: 3.0
    }
  ]);
  
  const handleAddRecipe = (recipe: Recipe) => {
    const newMenuRecipe: MenuRecipe = {
      recipeId: recipe.id,
      title: recipe.title,
      role: 'Main',
      targetPercentage: 25,
      scaledMass: 3750,
      scaleFactor: 2.5
    };
    setMenuRecipes([...menuRecipes, newMenuRecipe]);
  };
  
  const handleRemoveRecipe = (recipeId: string) => {
    setMenuRecipes(menuRecipes.filter(r => r.recipeId !== recipeId));
  };
  
  const handleUpdateRole = (recipeId: string, role: MenuRecipe['role']) => {
    setMenuRecipes(menuRecipes.map(r => 
      r.recipeId === recipeId ? { ...r, role } : r
    ));
  };
  
  const handleUpdatePercentage = (recipeId: string, percentage: number) => {
    setMenuRecipes(menuRecipes.map(r => 
      r.recipeId === recipeId ? { ...r, targetPercentage: percentage } : r
    ));
  };
  
  return (
    <div>
      <EventHeader
        eventName={eventName}
        headcount={headcount}
        targetMass={targetMass}
        dietaryTags={['Vegetarian', 'Gluten-free']}
        onEventNameChange={setEventName}
        onHeadcountChange={setHeadcount}
        onTargetMassChange={setTargetMass}
      />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <RecipeSelector recipes={MOCK_RECIPES} onAddRecipe={handleAddRecipe} />
        <MenuBuilder
          menuRecipes={menuRecipes}
          onRemoveRecipe={handleRemoveRecipe}
          onUpdateRole={handleUpdateRole}
          onUpdatePercentage={handleUpdatePercentage}
        />
      </div>
      
      <ConstraintWarnings warnings={MOCK_WARNINGS} />
      <ScaledIngredientList ingredients={MOCK_INGREDIENTS} />
    </div>
  );
}
