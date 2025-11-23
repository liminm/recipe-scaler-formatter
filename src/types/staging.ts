import { z } from 'zod';
import { IngredientRoleSchema, DependencyRoleSchema, IngredientStateSchema } from './models';

// Staging models allow for raw strings and missing data during the ingestion/editing phase.

export const StagingIngredientSchema = z.object({
    id: z.string().uuid(),
    name_raw: z.string(),
    name_normalized: z.string().optional(),

    // Raw extracted values
    quantity_raw: z.string().optional(),
    unit_raw: z.string().optional(),

    // Proposed normalized values (editable)
    base_quantity_g: z.number().optional(), // Using number for JSON serialization in UI
    yield_factor: z.number().default(1),

    // Metadata
    is_discrete: z.boolean().default(false),
    purchase_unit: z.string().optional(),

    role: IngredientRoleSchema.default('CONSUMABLE'),
    dependency_role: DependencyRoleSchema.default('PASSENGER'),

    state: IngredientStateSchema.optional(),

    // QA Flags
    density_confidence: z.enum(['high', 'low']).default('high'),
    needs_review: z.boolean().default(false),
});

export type StagingIngredient = z.infer<typeof StagingIngredientSchema>;

export const StagingStepSchema = z.object({
    id: z.string().uuid(),
    order: z.number(),
    instruction_raw: z.string(),
    instruction_normalized: z.string().optional(),
    time_estimate_minutes: z.number().optional(),
    constraint_tags: z.array(z.string()).default([]),
});

export type StagingStep = z.infer<typeof StagingStepSchema>;

export const StagingRecipeSchema = z.object({
    id: z.string().uuid(),
    title: z.string().default('Untitled Recipe'),
    source_url: z.string().optional(),
    original_yield_servings: z.number().optional(),

    ingredients: z.array(StagingIngredientSchema).default([]),
    steps: z.array(StagingStepSchema).default([]),
    chefs_notes: z.array(z.string()).default([]),

    // Yield estimation
    estimated_final_weight_g: z.number().optional(),
    yield_confidence: z.enum(['high', 'medium', 'low']).optional(),
    extraction_model: z.string().optional(),
    yield_estimation_model: z.string().optional(),

    raw_text: z.string().optional(), // For the split view
});

export type StagingRecipe = z.infer<typeof StagingRecipeSchema>;
