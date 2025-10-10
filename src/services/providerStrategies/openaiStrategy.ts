import { BaseProviderStrategy, ModelInfo } from './baseStrategy';
import { logger } from '@/utils/logger';

export class OpenAIStrategy extends BaseProviderStrategy {
  async fetchModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.axiosInstance.get(`${this.endpoint}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data.map((model: any) => ({
          id: model.id,
          name: model.id,
          description: `Created: ${new Date(model.created * 1000).toISOString()}`,
          owned_by: model.owned_by,
        }));
      }

      return [];
    } catch (error: any) {
      logger.error('OpenAI模型获取失败:', error.message);
      throw new Error(`获取OpenAI模型列表失败: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
