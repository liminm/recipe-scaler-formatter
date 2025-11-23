'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import EventHeader from '@/components/events/EventHeader';
import RecipeSelector from '@/components/events/RecipeSelector';
import MenuBuilder from '@/components/events/MenuBuilder';
import ConstraintWarnings from '@/components/events/ConstraintWarnings';
import ScaledIngredientList from '@/components/events/ScaledIngredientList';

// Re-using types from components/events/
// In a real app, we'd import these from a shared types file
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
  instanceId?: string;
  title: string;
  role: 'Main' | 'Side' | 'Filler' | 'Dessert';
  targetPercentage: number;
  scaledMass: number;
  scaleFactor: number;
  originalMass: number;
  ingredients: Ingredient[];
}

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [headcount, setHeadcount] = useState(0);
  const [targetMass, setTargetMass] = useState(0);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  
  // Mock data for now until we wire up the full menu backend
  const [menuRecipes, setMenuRecipes] = useState<MenuRecipe[]>([]);
  const [libraryRecipes, setLibraryRecipes] = useState<Recipe[]>([]);


  useEffect(() => {
    async function loadEventAndRecipes() {
      try {
        // Load Event
        const resEvent = await fetch(`/api/events/${id}`);
        const dataEvent = await resEvent.json();
        
        if (dataEvent.event) {
          setEventName(dataEvent.event.name);
          setHeadcount(dataEvent.event.total_headcount);
          setTargetMass(dataEvent.event.target_weight_per_person_g);
          setDietaryTags(dataEvent.event.dietary_tags || []);
          
          // Load existing menu items
          if (dataEvent.menu) {
            // We need to fetch ingredients for existing menu items too
            // For now, let's just map the basic info and maybe fetch ingredients in a separate effect or loop
            // This is getting complex for a single file. 
            // Ideally we'd have a 'useRecipe' hook or similar.
            // Let's just fetch them one by one for now to get it working.
            
            const formattedMenu = await Promise.all(dataEvent.menu.map(async (item: any) => {
               // Fetch full recipe to get ingredients
               // We'll use the public API if available or just mock it if we can't easily get it
               // Let's try to fetch from /api/recipes/[id]
               let ingredients: Ingredient[] = [];
               try {
                 const res = await fetch(`/api/recipes/${item.base_recipe_id}`);
                 const data = await res.json();
                 // API returns { recipe, ingredients, steps }
                 if (data.ingredients) {
                   ingredients = data.ingredients.map((ing: any) => ({
                     name: ing.name_normalized,
                     quantity: 0, // Calculated later
                     role: ing.role,
                     isHighPotency: ing.is_high_potency,
                     baseQuantity: Number(ing.base_quantity_g)
                   }));
                 }
               } catch (e) {
                 console.error('Failed to load ingredients for', item.base_recipe_id);
               }

               return {
                recipeId: item.base_recipe_id,
                title: item.base_recipe?.title || 'Unknown Recipe',
                role: item.role,
                targetPercentage: item.target_menu_percentage || 0,
                scaledMass: item.scaled_total_mass_g || 0,
                scaleFactor: item.scale_factor || 1,
                originalMass: 1000, // Fallback
                instanceId: item.id,
                ingredients
              };
            }));
            setMenuRecipes(formattedMenu);
          }
        }

        // Load Recipe Library
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

  // Recalculate scaling whenever event totals change
  useEffect(() => {
    if (headcount > 0 && targetMass > 0) {
      const totalEventMass = headcount * targetMass;
      setMenuRecipes(prev => prev.map(r => {
        const newScaledMass = (r.targetPercentage / 100) * totalEventMass;
        // Avoid division by zero
        const newScaleFactor = r.originalMass > 0 ? newScaledMass / r.originalMass : 1;
        return {
          ...r,
          scaledMass: newScaledMass,
          scaleFactor: newScaleFactor
        };
      }));
    }
  }, [headcount, targetMass]);

  const handleAddRecipe = async (recipe: Recipe) => {
    // Fetch full recipe details to get ingredients
    let ingredients: Ingredient[] = [];
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`);
      const data = await res.json();
      // API returns { recipe, ingredients, steps }
      if (data.ingredients) {
        ingredients = data.ingredients.map((ing: any) => ({
          name: ing.name_normalized,
          quantity: 0, 
          role: ing.role,
          isHighPotency: ing.is_high_potency,
          baseQuantity: Number(ing.base_quantity_g)
        }));
      }
    } catch (e) {
      console.error('Failed to fetch recipe details', e);
    }

    // Estimate original mass if missing
    const originalMass = recipe.estimated_final_weight_g || (recipe.original_yield_servings || 4) * 300;

    const newMenuItem: MenuRecipe = {
      recipeId: recipe.id,
      title: recipe.title,
      role: 'Main', // Default role
      targetPercentage: 0,
      scaledMass: 0,
      scaleFactor: 1,
      originalMass: originalMass,
      ingredients,
      instanceId: crypto.randomUUID() // Generate unique ID for frontend state
    };
    
    setMenuRecipes(prev => [...prev, newMenuItem]);
  };

  const handleSave = async () => {
    // Update event details
    try {
      await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: eventName,
          total_headcount: headcount,
          target_weight_per_person_g: targetMass,
          dietary_tags: dietaryTags
        })
      });
      
      alert('Event details saved! (Menu saving WIP)');
    } catch (error) {
      console.error(error);
      alert('Failed to save');
    }
  };

  // Calculate aggregated ingredients
  const aggregatedIngredients = menuRecipes.flatMap(r => 
    (r.ingredients || []).map(ing => ({
      ...ing,
      quantity: ing.baseQuantity * r.scaleFactor
    }))
  ).reduce((acc, curr) => {
    const existing = acc.find(i => i.name === curr.name && i.role === curr.role);
    if (existing) {
      existing.quantity += curr.quantity;
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, [] as any[]);

  if (isLoading) return <div className="flex-center" style={{ height: '50vh' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <a href="/events" className="text-muted" style={{ textDecoration: 'none' }}>← Back to Events</a>
      </div>
      
      <EventHeader
        eventName={eventName}
        headcount={headcount}
        targetMass={targetMass}
        dietaryTags={dietaryTags}
        onEventNameChange={setEventName}
        onHeadcountChange={setHeadcount}
        onTargetMassChange={setTargetMass}
        onRemoveTag={(tag) => setDietaryTags(prev => prev.filter(t => t !== tag))}
        onSave={handleSave}
        isSaving={false}
      />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <RecipeSelector 
          recipes={libraryRecipes} 
          onAddRecipe={handleAddRecipe} 
        />
        <MenuBuilder
          menuRecipes={menuRecipes}
          onRemoveRecipe={(instanceId) => setMenuRecipes(prev => prev.filter(r => r.instanceId !== instanceId))}
          onUpdateRole={(instanceId, role) => {
            setMenuRecipes(prev => prev.map(r => 
              r.instanceId === instanceId ? { ...r, role } : r
            ));
          }}
          onUpdatePercentage={(instanceId, pct) => {
            const totalEventMass = headcount * targetMass;
            setMenuRecipes(prev => prev.map(r => {
              if (r.instanceId !== instanceId) return r;
              
              const newScaledMass = (pct / 100) * totalEventMass;
              const newScaleFactor = r.originalMass > 0 ? newScaledMass / r.originalMass : 1;
              
              return { 
                ...r, 
                targetPercentage: pct,
                scaledMass: newScaledMass,
                scaleFactor: newScaleFactor
              };
            }));
          }}
        />
      </div>
      
      <ConstraintWarnings warnings={[]} />
      <ScaledIngredientList ingredients={aggregatedIngredients} />
    </div>
  );
}
