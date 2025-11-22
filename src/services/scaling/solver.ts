import { Decimal } from '../../lib/decimal';
import { Event, RecipeInstance, Recipe, Ingredient } from '../../types/models';

export interface ScalingResult {
    updatedInstances: RecipeInstance[];
    globalDeficit: Decimal;
    warnings: string[];
}

// Calculate the net edible mass of a base recipe
export function calculateBaseMass(recipe: Recipe): Decimal {
    return recipe.ingredients.reduce((total, ing) => {
        if (ing.role !== 'CONSUMABLE') return total;
        // base * yield
        return total.plus(ing.base_quantity_g.times(ing.yield_factor));
    }, new Decimal(0));
}

export function solveMenuScaling(
    event: Event,
    recipesMap: Record<string, Recipe>
): ScalingResult {
    const warnings: string[] = [];
    const totalHeadcount = new Decimal(event.total_headcount);
    const targetPerPerson = event.target_weight_per_person_g;
    const globalTargetMass = totalHeadcount.times(targetPerPerson);

    let allocatedMass = new Decimal(0);
    const updatedInstances: RecipeInstance[] = [];

    // 1. First Pass: Handle Strict Constraints
    // (target_total_mass_g or target_per_person_g)
    const elasticInstances: RecipeInstance[] = [];

    for (const instance of event.menu) {
        const baseRecipe = recipesMap[instance.base_recipe_id];
        if (!baseRecipe) {
            warnings.push(`Base recipe not found for instance ${instance.id}`);
            updatedInstances.push(instance);
            continue;
        }

        let targetMass: Decimal | null = null;

        if (instance.target_total_mass_g) {
            targetMass = instance.target_total_mass_g;
        } else if (instance.target_per_person_g) {
            // If variant_headcount is set, use that, otherwise global headcount
            const count = instance.variant_headcount
                ? new Decimal(instance.variant_headcount)
                : totalHeadcount;
            targetMass = instance.target_per_person_g.times(count);
        }

        if (targetMass) {
            // Strict
            const baseMass = calculateBaseMass(baseRecipe);
            const scaleFactor = baseMass.isZero() ? new Decimal(0) : targetMass.dividedBy(baseMass);

            updatedInstances.push({
                ...instance,
                scaled_total_mass_g: targetMass,
                scale_factor: scaleFactor
            });
            allocatedMass = allocatedMass.plus(targetMass);
        } else {
            // Elastic (or unconfigured)
            elasticInstances.push(instance);
        }
    }

    // 2. Second Pass: Distribute Remaining Mass to Elastic Items
    const remainingMass = globalTargetMass.minus(allocatedMass);

    if (remainingMass.isNegative()) {
        warnings.push('Strict constraints exceed global target mass.');
    }

    // Normalize percentages if they don't sum to 100% of the *remaining* space?
    // Or assume percentages are relative to the *global* mass?
    // Prompt says: "target_menu_percentage (e.g. 40% of total food mass)"
    // So it's % of GLOBAL mass.

    for (const instance of elasticInstances) {
        const baseRecipe = recipesMap[instance.base_recipe_id];
        if (!baseRecipe) {
            updatedInstances.push(instance);
            continue;
        }

        let targetMass = new Decimal(0);

        if (instance.target_menu_percentage) {
            // Percentage of GLOBAL target
            targetMass = globalTargetMass.times(instance.target_menu_percentage.dividedBy(100));
        } else {
            // No constraint? It might be a filler or just unassigned.
            // For now, leave as 0 or handle in filler logic.
            // If it's a "side" without constraints, maybe it gets a default?
            // Let's assume 0 for now and warn.
            warnings.push(`Instance ${instance.id} has no scaling constraints.`);
        }

        const baseMass = calculateBaseMass(baseRecipe);
        const scaleFactor = baseMass.isZero() ? new Decimal(0) : targetMass.dividedBy(baseMass);

        updatedInstances.push({
            ...instance,
            scaled_total_mass_g: targetMass,
            scale_factor: scaleFactor
        });
        allocatedMass = allocatedMass.plus(targetMass);
    }

    const finalDeficit = globalTargetMass.minus(allocatedMass);

    return {
        updatedInstances,
        globalDeficit: finalDeficit,
        warnings
    };
}
