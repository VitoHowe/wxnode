import { BaseProviderStrategy, ModelInfo } from './baseStrategy';
import { logger } from '@/utils/logger';

export class QwenStrategy extends BaseProviderStrategy {
  async fetchModels(): Promise<ModelInfo[]> {
    try {
      // 通义千问的模型列表API
      // 注意：实际的阿里云DashScope API可能需要不同的认证方式
      const response = await this.axiosInstance.get(
        'https://dashscope.aliyuncs.com/api/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data.map((model: any) => ({
          id: model.model_id || model.id,
          name: model.model_name || model.name || model.model_id,
          description: model.description,
          type: model.model_type,
        }));
      }

      // 如果API不支持，返回常用模型列表
      logger.warn('Qwen API返回格式异常，返回预定义模型列表');
      return this.getDefaultQwenModels();
    } catch (error: any) {
      logger.error('Qwen模型获取失败，返回预定义列表:', error.message);
      // 如果API调用失败，返回已知的通义千问模型列表
      return this.getDefaultQwenModels();
    }
  }

  private getDefaultQwenModels(): ModelInfo[] {
    return [
      {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        description: '通义千问超大规模语言模型，支持中文英文等不同语言输入',
      },
      {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        description: '通义千问增强版，性能更强',
      },
      {
        id: 'qwen-max',
        name: 'Qwen Max',
        description: '通义千问最强版本',
      },
      {
        id: 'qwen-max-longcontext',
        name: 'Qwen Max Long Context',
        description: '通义千问最强版本-长文本',
      },
    ];
  }
}
