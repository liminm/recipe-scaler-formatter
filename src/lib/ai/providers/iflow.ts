import { AIModel, ModelTier } from '../types';

const apiKey = process.env.IFLOW_API_KEY;

if (!apiKey) {
    console.warn('IFLOW_API_KEY is missing. Check your .env.local file.');
}

// Define the model hierarchy for iFlow
const CRITICAL_HIERARCHY = [
    'deepseek-v3.2',   // DeepSeek V3.2 (primary)
    'glm-4.6',         // GLM 4.6 (backup)
    'kimi-k2-0905',    // Kimi K2 (backup)
];

const STANDARD_HIERARCHY = [
    'deepseek-v3.2',   // DeepSeek V3.2 (primary)
    'glm-4.6',         // GLM 4.6 (backup)
    'kimi-k2-0905',    // Kimi K2 (backup)
];

export class IFlowProvider implements AIModel {
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
                console.log(`🔄 iFlow: Calling ${modelName}...`);
                const startTime = Date.now();

                // Add timeout using AbortController
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

                const response = await fetch("https://apis.iflow.cn/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
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
                console.log(`✅ iFlow: ${modelName} responded in ${elapsed}s`);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`iFlow API error: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();

                // Validate response structure
                if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
                    throw new Error(`Invalid response structure: missing choices array. Response: ${JSON.stringify(data).substring(0, 200)}`);
                }

                if (!data.choices[0].message || !data.choices[0].message.content) {
                    throw new Error(`Invalid response structure: missing message content. Response: ${JSON.stringify(data).substring(0, 200)}`);
                }

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

                return { result, modelUsed: `iflow/${modelName}` };

            } catch (error: any) {
                lastError = error;
                console.warn(`⚠️ Error for ${modelName} (${error.message}), attempting fallback...`);
                continue;
            }
        }

        throw new Error(`All iFlow models failed. Last error: ${lastError?.message}`);
    }
}
