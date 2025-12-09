import { AIModel, AIProvider, ModelTier } from './types';
import { GeminiProvider } from './providers/gemini';
import { OpenRouterProvider } from './providers/openrouter';
import { IFlowProvider } from './providers/iflow';

export function getAIModel(provider: AIProvider = 'gemini', tier: ModelTier = 'standard'): AIModel {
    switch (provider) {
        case 'openrouter':
            return new OpenRouterProvider(tier);
        case 'iflow':
            return new IFlowProvider(tier);
        case 'gemini':
        default:
            return new GeminiProvider(tier);
    }
}
