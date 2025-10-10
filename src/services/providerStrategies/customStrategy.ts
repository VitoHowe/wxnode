import { BaseProviderStrategy, ModelInfo } from './baseStrategy';

export class CustomStrategy extends BaseProviderStrategy {
  async fetchModels(): Promise<ModelInfo[]> {
    // 自定义供应商不支持自动获取模型列表
    throw new Error('自定义供应商不支持自动获取模型列表，请手动配置模型信息');
  }
}
