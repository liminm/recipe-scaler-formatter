'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import EventHeader from '@/components/events/EventHeader';
import RecipeEditor from '@/components/RecipeEditor';
import ShoppingList from '@/components/ShoppingList';

interface Recipe {
  id: string;
  title: string;
  original_yield_servings?: number;
  estimated_final_weight_g?: number;
  tags?: string[];
}

interface Ingredient {
  name: string;
  quantity: number;
  role: string;
  isHighPotency: boolean;
  baseQuantity: number;
}

interface MenuRecipe {
  recipeId: string;
  instanceId: string;
  title: string;
  role: 'Main' | 'Side' | 'Filler' | 'Dessert';
  baseServings: number;
  targetServings: number;
  ingredients: Ingredient[];
  ingredientOverrides?: Record<string, number>;
  notes?: string;
  steps?: string[];
}

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [headcount, setHeadcount] = useState(0);
  const [targetMass, setTargetMass] = useState(0);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [menuRecipes, setMenuRecipes] = useState<MenuRecipe[]>([]);
  const [libraryRecipes, setLibraryRecipes] = useState<Recipe[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadEventAndRecipes() {
      try {
        const resEvent = await fetch(`/api/events/${id}`);
        const dataEvent = await resEvent.json();

        if (dataEvent.event) {
          setEventName(dataEvent.event.name);
          setHeadcount(dataEvent.event.total_headcount);
          setTargetMass(dataEvent.event.target_weight_per_person_g);
          setDietaryTags(dataEvent.event.dietary_tags || []);

          if (dataEvent.menu) {
            const formattedMenu = await Promise.all(
              dataEvent.menu.map(async (item: any) => {
                let ingredients: Ingredient[] = [];
                let steps: string[] = [];
                try {
                  const res = await fetch(`/api/recipes/${item.base_recipe_id}`);
                  const data = await res.json();
                  if (data.ingredients) {
                    ingredients = data.ingredients.map((ing: any) => ({
                      name: ing.name_normalized,
                      quantity: 0,
                      role: ing.role,
                      isHighPotency: ing.is_high_potency,
                      baseQuantity: Number(ing.base_quantity_g),
                    }));
                  }
                  if (data.steps) {
                    steps = data.steps.map((s: any) => s.instruction_raw || '');
                  }
                } catch (e) {
                  console.error('Failed to load ingredients for', item.base_recipe_id);
                }

                const baseServings = item.base_recipe?.original_yield_servings || 4;
                return {
                  recipeId: item.base_recipe_id,
                  title: item.base_recipe?.title || 'Unknown Recipe',
                  role: item.role || 'Main',
                  baseServings,
                  targetServings: item.target_servings || baseServings,
                  ingredients,
                  ingredientOverrides: item.ingredient_overrides || {},
                  notes: item.notes || '',
                  steps,
                  instanceId: item.id,
                } as MenuRecipe;
              })
            );
            setMenuRecipes(formattedMenu);
            if (formattedMenu.length) {
              setSelectedMenuId(formattedMenu[0].instanceId);
            }
          }
        }

        const resRecipes = await fetch('/api/recipes/list');
        const dataRecipes = await resRecipes.json();
        if (dataRecipes.recipes) {
          setLibraryRecipes(dataRecipes.recipes);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadEventAndRecipes();
  }, [id]);

  const handleAddRecipe = async (recipe: Recipe) => {
    let ingredients: Ingredient[] = [];
    let steps: string[] = [];
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`);
      const data = await res.json();
      if (data.ingredients) {
        ingredients = data.ingredients.map((ing: any) => ({
          name: ing.name_normalized,
          quantity: 0,
          role: ing.role,
          isHighPotency: ing.is_high_potency,
          baseQuantity: Number(ing.base_quantity_g),
        }));
      }
      if (data.steps) {
        steps = data.steps.map((s: any) => s.instruction_raw || '');
      }
    } catch (e) {
      console.error('Failed to fetch recipe details', e);
    }

    const baseServings = recipe.original_yield_servings || 4;
    const newMenuItem: MenuRecipe = {
      recipeId: recipe.id,
      title: recipe.title,
      role: 'Main',
      baseServings,
      targetServings: headcount || baseServings,
      ingredients,
      ingredientOverrides: {},
      steps,
      instanceId: crypto.randomUUID(),
    };

    setMenuRecipes((prev) => {
      const next = [...prev, newMenuItem];
      if (!selectedMenuId) {
        setSelectedMenuId(newMenuItem.instanceId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: eventName,
          total_headcount: headcount,
          target_weight_per_person_g: targetMass,
          dietary_tags: dietaryTags,
          menu: menuRecipes.map((m) => ({
            id: m.instanceId,
            base_recipe_id: m.recipeId,
            target_servings: m.targetServings,
            ingredient_overrides: m.ingredientOverrides,
            notes: m.notes,
            role: m.role,
          })),
        }),
      });
      alert('Event saved (menu + overrides)!');
    } catch (error) {
      console.error(error);
      alert('Failed to save');
    }
  };

  const selectedItem = menuRecipes.find((m) => m.instanceId === selectedMenuId) || null;

  const scaleFactor = (item: MenuRecipe) => {
    const base = item.baseServings || 1;
    const target = item.targetServings || base;
    return base > 0 ? target / base : 1;
  };

  const aggregatedIngredients = useMemo(() => {
    return menuRecipes
      .flatMap((item) =>
        (item.ingredients || []).map((ing) => {
          const override = item.ingredientOverrides?.[ing.name];
          const quantity = typeof override === 'number' ? override : ing.baseQuantity * scaleFactor(item);
          return { ...ing, quantity };
        })
      )
      .reduce((acc, curr) => {
        const existing = acc.find((i) => i.name === curr.name && i.role === curr.role);
        if (existing) {
          existing.quantity += curr.quantity;
        } else {
          acc.push({ ...curr });
        }
        return acc;
      }, [] as any[]);
  }, [menuRecipes]);

  const filteredLibrary = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return libraryRecipes;
    return libraryRecipes.filter((r) => r.title.toLowerCase().includes(term));
  }, [libraryRecipes, searchTerm]);

  if (isLoading) return <div className="flex-center" style={{ height: '50vh' }}>Loading...</div>;

  return (
    <div className="event-page">
      <div style={{ marginBottom: '1rem' }}>
        <a href="/events" className="text-muted" style={{ textDecoration: 'none' }}>
          ← Back to Events
        </a>
      </div>

      <EventHeader
        eventName={eventName}
        headcount={headcount}
        targetMass={targetMass}
        dietaryTags={dietaryTags}
        onEventNameChange={setEventName}
        onHeadcountChange={setHeadcount}
        onTargetMassChange={setTargetMass}
        onRemoveTag={(tag) => setDietaryTags((prev) => prev.filter((t) => t !== tag))}
        onSave={handleSave}
        isSaving={false}
      />

      <div className="event-layout">
        <div className="event-panel">
          <div className="ingest-section-head">
            <div>
              <p className="eyebrow">Menu</p>
              <h3>Menu Builder</h3>
            </div>
            <div className="pill">Headcount: {headcount || '—'}</div>
          </div>

          <div className="library-controls" style={{ padding: '0.75rem', marginBottom: '0.75rem' }}>
            <input
              className="input-field"
              placeholder="Search library to add recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="filter-chips" style={{ marginTop: '0.5rem' }}>
              {filteredLibrary.slice(0, 6).map((r) => (
                <button key={r.id} className="chip" onClick={() => handleAddRecipe(r)}>
                  + {r.title}
                </button>
              ))}
            </div>
          </div>

          <div className="ingest-batch-items">
            {menuRecipes.length === 0 && <p className="text-muted">No recipes yet. Add from the library above.</p>}
            {menuRecipes.map((item) => (
              <button
                key={item.instanceId}
                onClick={() => setSelectedMenuId(item.instanceId)}
                className={`ingest-batch-item ${item.instanceId === selectedMenuId ? 'active' : ''}`}
              >
                <div className="ingest-batch-title">{item.title}</div>
                <div className="ingest-batch-status">
                  {item.targetServings} servings · {item.role}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="event-panel recipe-panel">
          {selectedItem ? (
            <>
              <div className="recipe-header">
                <div>
                  <p className="eyebrow">Review & edit</p>
                  <h2>{selectedItem.title}</h2>
                </div>
                <div className="recipe-header-actions">
                  <label className="text-muted">
                    Servings
                    <input
                      type="number"
                      value={selectedItem.targetServings}
                      min={1}
                      className="input-field"
                      style={{ width: '110px' }}
                      onChange={(e) => {
                        const next = Number(e.target.value) || selectedItem.baseServings;
                        setMenuRecipes((prev) =>
                          prev.map((m) =>
                            m.instanceId === selectedItem.instanceId ? { ...m, targetServings: next } : m
                          )
                        );
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="yield-card">
                <div>
                  <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                    Base yield
                  </span>
                  <div className="stat-value" style={{ fontSize: '1rem' }}>
                    {selectedItem.baseServings} servings
                  </div>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                    Target yield
                  </span>
                  <div className="stat-value" style={{ fontSize: '1rem' }}>
                    {selectedItem.targetServings} servings (x{scaleFactor(selectedItem).toFixed(2)})
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <RecipeEditor
                  recipe={{
                    id: selectedItem.recipeId,
                    title: selectedItem.title,
                    original_yield_servings: selectedItem.baseServings,
                    ingredients: selectedItem.ingredients.map(ing => ({
                      id: crypto.randomUUID(),
                      name_raw: ing.name,
                      name_normalized: ing.name,
                      base_quantity_g: ing.baseQuantity,
                      role: ing.role as any,
                      yield_factor: 1,
                      is_discrete: false,
                      dependency_role: 'PASSENGER',
                      density_confidence: 'high',
                      needs_review: false
                    })),
                    steps: (selectedItem.steps || []).map((step, idx) => ({
                      id: crypto.randomUUID(),
                      order: idx + 1,
                      instruction_raw: step,
                      constraint_tags: []
                    })),
                    chefs_notes: [],
                    estimated_final_weight_g: 0 // Not tracked in MenuRecipe
                  }}
                  onSave={async (updatedRecipe) => {
                    try {
                      // Update base recipe on backend
                      await fetch(`/api/recipes/${updatedRecipe.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: updatedRecipe.title,
                          ingredients: updatedRecipe.ingredients,
                          steps: updatedRecipe.steps,
                          original_yield_servings: updatedRecipe.original_yield_servings
                        })
                      });

                      // Update local state
                      setMenuRecipes(prev => prev.map(m => {
                        if (m.recipeId !== updatedRecipe.id) return m;
                        return {
                          ...m,
                          title: updatedRecipe.title,
                          baseServings: updatedRecipe.original_yield_servings || m.baseServings,
                          ingredients: updatedRecipe.ingredients.map(ing => ({
                            name: ing.name_normalized || ing.name_raw,
                            quantity: 0, // Calculated dynamically
                            role: ing.role,
                            isHighPotency: false, // Deprecated
                            baseQuantity: ing.base_quantity_g || 0
                          })),
                          steps: updatedRecipe.steps.map(s => s.instruction_raw)
                        };
                      }));
                      
                      alert('Recipe updated! This affects all events using this recipe.');
                    } catch (error) {
                      console.error('Failed to update recipe:', error);
                      alert('Failed to save recipe changes.');
                    }
                  }}
                  saveLabel="Save Changes to Base Recipe"
                />
              </div>

              <div className="steps-panel" style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <div className="ingest-section-head">
                  <h3>Event Notes</h3>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <textarea
                    className="input-field"
                    placeholder="Event-specific notes for this recipe..."
                    value={selectedItem.notes || ''}
                    rows={3}
                    onChange={(e) =>
                      setMenuRecipes((prev) =>
                        prev.map((m) =>
                          m.instanceId === selectedItem.instanceId ? { ...m, notes: e.target.value } : m
                        )
                      )
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted">Select a menu item to edit details.</p>
          )}
        </div>

        <ShoppingList ingredients={aggregatedIngredients} />
      </div>
    </div>
  );
}
