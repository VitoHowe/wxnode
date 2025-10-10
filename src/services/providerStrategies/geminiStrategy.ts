import { BaseProviderStrategy, ModelInfo } from './baseStrategy';
import { logger } from '@/utils/logger';

export class GeminiStrategy extends BaseProviderStrategy {
  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.axiosInstance.get(
        `https://generativelanguage.googleapis.com/v1/models?key=${this.apiKey}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && Array.isArray(response.data.models)) {
        return response.data.models.map((model: any) => ({
          id: model.name,
          name: model.displayName || model.name,
          description: model.description,
          version: model.version,
          supportedGenerationMethods: model.supportedGenerationMethods,
        }));
      }

      return [];
    } catch (error: any) {
      logger.error('Gemini模型获取失败:', error.message);
      throw new Error(`获取Gemini模型列表失败: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
