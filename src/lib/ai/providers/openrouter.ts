import { AIModel, ModelTier } from '../types';

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    console.warn('OPENROUTER_API_KEY is missing. Check your .env.local file.');
}

// Define the model hierarchy for OpenRouter
const CRITICAL_HIERARCHY = [
    'z-ai/glm-4.5-air:free', // Z-AI GLM 4.5 Air (free)
];

const STANDARD_HIERARCHY = [
    'z-ai/glm-4.5-air:free', // Z-AI GLM 4.5 Air (free)
];

export class OpenRouterProvider implements AIModel {
    private modelNames: string[];

    constructor(tier: ModelTier = 'standard') {
        this.modelNames = tier === 'critical' ? CRITICAL_HIERARCHY : STANDARD_HIERARCHY;
    }

    async generateContent(prompt: any): Promise<{ result: any, modelUsed: string }> {
        let lastError: any;

        // Extract text from prompt if it's a complex object, or use it directly if string
        let promptText = '';
        if (typeof prompt === 'string') {
            promptText = prompt;
        } else if (prompt.contents && prompt.contents[0] && prompt.contents[0].parts && prompt.contents[0].parts[0]) {
            promptText = prompt.contents[0].parts[0].text;
        } else {
            // Fallback for other structures if needed, or stringify
            promptText = JSON.stringify(prompt);
        }

        for (let i = 0; i < this.modelNames.length; i++) {
            const modelName = this.modelNames[i];

            try {
                console.log(`🔄 OpenRouter: Calling ${modelName}...`);
                const startTime = Date.now();

                // Add timeout using AbortController
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://recipe-scaler.vercel.app",
                        "X-Title": "Recipe Scaler",
                    },
                    body: JSON.stringify({
                        "model": modelName,
                        "messages": [
                            { "role": "user", "content": promptText }
                        ],
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`✅ OpenRouter: ${modelName} responded in ${elapsed}s`);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();
                const content = data.choices[0].message.content;

                // Mimic the Gemini response structure for compatibility
                const result = {
                    response: {
                        text: () => content
                    }
                };

                // If we fell back, log it
                if (i > 0) {
                    console.warn(`⚠️ Fallback: Used ${modelName} (Tier ${i + 1}) instead of primary model.`);
                }

                return { result, modelUsed: modelName };

            } catch (error: any) {
                lastError = error;
                console.warn(`⚠️ Error for ${modelName} (${error.message}), attempting fallback...`);
                continue;
            }
        }

        throw new Error(`All OpenRouter models failed. Last error: ${lastError?.message}`);
    }
}
