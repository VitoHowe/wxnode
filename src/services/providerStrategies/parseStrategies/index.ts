import { ProviderType, ProviderConfig } from '@/services/systemService';
import { BaseParseStrategy } from './baseParseStrategy';
import { OpenAIParseStrategy } from './openaiParseStrategy';
import { GeminiParseStrategy } from './geminiParseStrategy';
import { QwenParseStrategy } from './qwenParseStrategy';

// 文件类型
type FileType = 'question_bank' | 'knowledge_base';

export function getParseStrategy(
  provider: ProviderConfig,
  modelName: string,
  fileType: FileType = 'question_bank'
): BaseParseStrategy {
  switch (provider.type) {
    case 'openai':
      return new OpenAIParseStrategy(provider, modelName, fileType);
    case 'gemini':
      return new GeminiParseStrategy(provider, modelName, fileType);
    case 'qwen':
      return new QwenParseStrategy(provider, modelName, fileType);
    case 'custom':
      throw new Error('自定义供应商不支持自动解析，请使用其他方式');
    default:
      throw new Error(`不支持的供应商类型: ${provider.type}`);
  }
}

export * from './baseParseStrategy';
export * from './openaiParseStrategy';
export * from './geminiParseStrategy';
export * from './qwenParseStrategy';
