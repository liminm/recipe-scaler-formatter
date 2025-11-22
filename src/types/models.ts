import { z } from 'zod';
import { Decimal } from 'decimal.js';

// Helper for Decimal serialization
// We accept Decimal instances, strings, or numbers, but internally we want to work with Decimals.
// When validating from API/DB, we might get strings/numbers.
export const DecimalSchema = z.custom<Decimal>((val) => {
    if (val instanceof Decimal) return true;
    if (typeof val === 'string' || typeof val === 'number') return true;
    return false;
}).transform(val => new Decimal(val));

// --- Enums ---
export const IngredientStateSchema = z.enum(['fresh', 'canned', 'dry', 'frozen', 'pre-cooked']);
export const IngredientRoleSchema = z.enum(['CONSUMABLE', 'PROCESS_ONLY', 'REDUCTION']);
export const DependencyRoleSchema = z.enum(['DRIVER', 'PASSENGER', 'CRITICAL_RATIO']);
export const RecipeRoleSchema = z.enum(['main', 'side', 'dessert', 'filler']);

// --- Ingredient ---
export const IngredientSchema = z.object({
    id: z.string().uuid(),
    name_raw: z.string(),
    name_normalized: z.string(),

    // Quantities & Yield
    base_quantity_g: DecimalSchema,
    yield_factor: DecimalSchema.default(new Decimal(1)), // 0-1

    // Purchase Info
    is_discrete: z.boolean(),
    purchase_unit: z.string().optional(),

    // Roles
    role: IngredientRoleSchema,
    dependency_role: DependencyRoleSchema,

    // Flags
    is_high_potency: z.boolean().default(false),
    is_high_sodium: z.boolean().default(false),

    // Categorization
    aisle_category: z.string(),
    prep_type: z.string(),
    state: IngredientStateSchema,

    // Density (for volumetric conversion)
    density_g_ml: DecimalSchema.optional(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

// --- Step ---
export const StepSchema = z.object({
    id: z.string().uuid(),
    order: z.number(),
    instruction_raw: z.string(),
    instruction_normalized: z.string(),
    time_estimate_minutes: z.number().optional(),
    constraint_tags: z.array(z.string()), // e.g., "crowding", "temp_shock"
    ingredients_referenced: z.array(z.string().uuid()),
});

export type Step = z.infer<typeof StepSchema>;

// --- Recipe ---
export const RecipeSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    source_url: z.string().optional(),
    original_yield_servings: z.number().optional(),

    ingredients: z.array(IngredientSchema),
    steps: z.array(StepSchema),
    chefs_notes: z.array(z.string()),

    // Modular Structure
    is_base_module: z.boolean().default(true),
    variant_of_id: z.string().uuid().optional(),

    version_id: z.string(),
});

export type Recipe = z.infer<typeof RecipeSchema>;

// --- Recipe Instance (Menu Item) ---
export const RecipeInstanceSchema = z.object({
    id: z.string().uuid(),
    event_id: z.string().uuid(),
    base_recipe_id: z.string().uuid(),
    role: RecipeRoleSchema,

    // Scaling Constraints (One is required)
    target_per_person_g: DecimalSchema.optional(),
    target_total_mass_g: DecimalSchema.optional(),
    target_menu_percentage: DecimalSchema.optional(),

    // Variant Overrides
    variant_headcount: z.number().optional(),

    // Computed/Cached
    scaled_total_mass_g: DecimalSchema.optional(),
    scale_factor: DecimalSchema.optional(),
});

export type RecipeInstance = z.infer<typeof RecipeInstanceSchema>;

// --- Event ---
export const EventSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    total_headcount: z.number(),
    target_weight_per_person_g: DecimalSchema,

    // Equipment Profile
    equipment_profile: z.record(z.string(), z.number()), // { ovens: 2, burners: 4 }

    dietary_tags: z.array(z.string()),

    menu: z.array(RecipeInstanceSchema),
    version_id: z.string(),
});

export type Event = z.infer<typeof EventSchema>;
