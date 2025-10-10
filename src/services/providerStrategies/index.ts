import { ProviderType } from '../systemService';
import { ProviderStrategy } from './baseStrategy';
import { OpenAIStrategy } from './openaiStrategy';
import { GeminiStrategy } from './geminiStrategy';
import { QwenStrategy } from './qwenStrategy';
import { CustomStrategy } from './customStrategy';

export function getProviderStrategy(
  type: ProviderType,
  endpoint: string,
  apiKey: string,
  config: Record<string, any> = {}
): ProviderStrategy {
  switch (type) {
    case 'openai':
      return new OpenAIStrategy(endpoint, apiKey, config);
    case 'gemini':
      return new GeminiStrategy(endpoint, apiKey, config);
    case 'qwen':
      return new QwenStrategy(endpoint, apiKey, config);
    case 'custom':
      return new CustomStrategy(endpoint, apiKey, config);
    default:
      throw new Error(`不支持的供应商类型: ${type}`);
  }
}

export * from './baseStrategy';
