import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn('GEMINI_API_KEY is missing. Check your .env.local file.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'placeholder');

// Define the model hierarchy as requested by user
const MODEL_HIERARCHY = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite'
];

// Define task types and their minimum acceptable model tier (floor)
// 0 = Pro, 4 = Flash-Lite
export const TASK_FLOORS = {
    CRITICAL: 3, // Stop at 2.0 Flash (index 3), don't use Lite
    STANDARD: 4, // Use everything including Lite
};

export class GeminiFallbackModel {
    private models: GenerativeModel[];
    private floorIndex: number;

    constructor(floorIndex: number = TASK_FLOORS.STANDARD) {
        this.floorIndex = floorIndex;
        // Initialize all models in the chain up to the floor
        this.models = MODEL_HIERARCHY
            .slice(0, this.floorIndex + 1)
            .map(modelName => genAI.getGenerativeModel({ model: modelName }));
    }

    async generateContent(prompt: any): Promise<{ result: any, modelUsed: string }> {
        let lastError: any;

        for (let i = 0; i < this.models.length; i++) {
            const model = this.models[i];
            const modelName = MODEL_HIERARCHY[i];

            try {
                // Attempt generation
                const result = await model.generateContent(prompt);

                // If we fell back, log it (could be enhanced to notify UI)
                if (i > 0) {
                    console.warn(`⚠️ Fallback: Used ${modelName} (Tier ${i + 1}) instead of primary model.`);
                }

                return { result, modelUsed: modelName };
            } catch (error: any) {
                lastError = error;

                // Check if it's a quota/rate limit error
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

                if (isQuotaError) {
                    console.warn(`⚠️ Quota exhausted for ${modelName}, attempting fallback...`);
                    continue; // Try next model
                }

                // If it's not a quota error (e.g. bad request), fail immediately
                throw error;
            }
        }

        // If we ran out of models
        throw new Error(`All models failed. Last error: ${lastError?.message}`);
    }
}

// Export configured instances
export const geminiCritical = new GeminiFallbackModel(TASK_FLOORS.CRITICAL); // For Extraction/Splitting
export const geminiStandard = new GeminiFallbackModel(TASK_FLOORS.STANDARD); // For Yield/Polish

// Keep legacy exports for backward compatibility but point them to the new system
export const geminiPro = geminiCritical;
export const geminiFlash = geminiStandard;
