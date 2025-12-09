import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AIModel, ModelTier } from '../types';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn('GEMINI_API_KEY is missing. Check your .env.local file.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'placeholder');

// Define the model hierarchy
const CRITICAL_HIERARCHY = [
    'gemini-2.0-pro-exp-02-05',        // High Intelligence (Primary for Critical)
    'gemini-2.0-flash',      // Reliable Backup
];

const STANDARD_HIERARCHY = [
    'gemini-2.0-flash',      // Fast & Capable (Primary for Standard)
    'gemini-2.0-flash-lite-preview-02-05'  // Ultimate Fallback
];

export class GeminiProvider implements AIModel {
    private models: GenerativeModel[];
    private modelNames: string[];

    constructor(tier: ModelTier = 'standard') {
        // Select the appropriate hierarchy based on the tier
        const hierarchy = tier === 'critical' ? CRITICAL_HIERARCHY : STANDARD_HIERARCHY;
        this.modelNames = hierarchy;

        // Initialize all models in the chain
        this.models = hierarchy
            .map(modelName => genAI.getGenerativeModel({ model: modelName }));
    }

    async generateContent(prompt: any): Promise<{ result: any, modelUsed: string }> {
        let lastError: any;

        for (let i = 0; i < this.models.length; i++) {
            const model = this.models[i];
            const modelName = this.modelNames[i];

            try {
                // Attempt generation
                // Handle both simple string prompts and complex objects
                const generationArg = prompt.contents ? prompt : prompt;
                const result = await model.generateContent(generationArg);

                // If we fell back, log it
                if (i > 0) {
                    console.warn(`⚠️ Fallback: Used ${modelName} (Tier ${i + 1}) instead of primary model.`);
                }

                return { result, modelUsed: modelName };
            } catch (error: any) {
                lastError = error;

                // Check if it's a quota/rate limit error OR a network/fetch error
                const isQuotaError = error.message?.includes('429') ||
                    error.message?.includes('quota') ||
                    error.message?.includes('Resource has been exhausted');

                const isNetworkError = error.message?.includes('fetch failed') ||
                    error.message?.includes('network') ||
                    error.message?.includes('timeout');

                if (isQuotaError || isNetworkError) {
                    console.warn(`⚠️ ${isQuotaError ? 'Quota exhausted' : 'Network error'} for ${modelName} (${error.message}), attempting fallback...`);
                    continue; // Try next model
                }

                // If it's not a quota/network error (e.g. bad request), fail immediately
                throw error;
            }
        }

        // If we ran out of models
        throw new Error(`All models failed. Last error: ${lastError?.message}`);
    }
}
