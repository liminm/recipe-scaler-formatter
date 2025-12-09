export type AIProvider = 'gemini' | 'openrouter' | 'iflow';
export type ModelTier = 'critical' | 'standard';

export interface AIModel {
    generateContent(prompt: any): Promise<{ result: any, modelUsed: string }>;
}

export interface AIProviderConfig {
    apiKey?: string;
}
