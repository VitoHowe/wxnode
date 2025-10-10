import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { ConflictError, NotFoundError } from '@/middleware/errorHandler';
import { getProviderStrategy, ModelInfo } from './providerStrategies';

export type ProviderType = 'openai' | 'gemini' | 'qwen' | 'custom';

export type { ModelInfo } from './providerStrategies';

export interface ProviderConfig {
  id: number;
  type: ProviderType;
  name: string;
  endpoint: string;
  api_key: string;
  provider_config: Record<string, any> | null;
  description: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}

interface CreateProviderConfigParams {
  type: ProviderType;
  name: string;
  endpoint: string;
  api_key: string;
  provider_config?: Record<string, any> | null;
  description?: string | null;
  status?: number;
}

interface UpdateProviderConfigParams {
  type?: ProviderType;
  name?: string;
  endpoint?: string;
  api_key?: string;
  provider_config?: Record<string, any> | null;
  description?: string | null;
  status?: number;
}

type SettingType = 'knowledge_format' | 'question_parse_format';

interface SystemSetting<T = any> {
  type: SettingType;
  payload: T;
  updated_by: number | null;
  updated_at: string;
}

class SystemService {
  async listProviderConfigs(status?: number): Promise<ProviderConfig[]> {
    let sql = 'SELECT * FROM ai_providers';
    const params: any[] = [];

    if (status !== undefined) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query(sql, params);
    return rows;
  }

  async getProviderConfigById(id: number): Promise<ProviderConfig | null> {
    const rows = await query('SELECT * FROM ai_providers WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async createProviderConfig(params: CreateProviderConfigParams): Promise<ProviderConfig> {
    const { type, name, endpoint, api_key, provider_config = null, description = null, status = 1 } = params;
    const normalizedDescription = description === '' ? null : description;
    const normalizedStatus = typeof status === 'number' ? status : 1;
    const normalizedProviderConfig = provider_config ? JSON.stringify(provider_config) : null;

    try {
      const result = await query(
        `INSERT INTO ai_providers (type, name, endpoint, api_key, provider_config, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [type, name, endpoint, api_key, normalizedProviderConfig, normalizedDescription, normalizedStatus]
      );

      const created = await this.getProviderConfigById(result.insertId);
      if (!created) {
        throw new Error('创建供应商配置后查询失败');
      }

      logger.info('供应商配置创建成功', { providerId: created.id, type: created.type, name: created.name });
      return created;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('该供应商类型和名称组合已存在');
      }
      logger.error('创建供应商配置失败', error);
      throw error;
    }
  }

  async updateProviderConfig(id: number, params: UpdateProviderConfigParams): Promise<ProviderConfig> {
    const existing = await this.getProviderConfigById(id);
    if (!existing) {
      throw new NotFoundError('供应商配置不存在');
    }

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        let normalizedValue = value;
        if (key === 'description' && value === '') {
          normalizedValue = null;
        } else if (key === 'provider_config') {
          normalizedValue = value ? JSON.stringify(value) : null;
        }
        fields.push(`${key} = ?`);
        values.push(normalizedValue);
      }
    });

    if (fields.length === 0) {
      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    try {
      await query(`UPDATE ai_providers SET ${fields.join(', ')} WHERE id = ?`, values);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('该供应商类型和名称组合已存在');
      }
      logger.error('更新供应商配置失败', error);
      throw error;
    }

    const updated = await this.getProviderConfigById(id);
    if (!updated) {
      throw new NotFoundError('供应商配置不存在');
    }

    logger.info('供应商配置更新成功', { providerId: id });
    return updated;
  }

  async deleteProviderConfig(id: number): Promise<void> {
    const existing = await this.getProviderConfigById(id);
    if (!existing) {
      throw new NotFoundError('供应商配置不存在');
    }

    await query('DELETE FROM ai_providers WHERE id = ?', [id]);
    logger.info('供应商配置已删除', { providerId: id });
  }

  async getProviderModels(id: number): Promise<ModelInfo[]> {
    const provider = await this.getProviderConfigById(id);
    if (!provider) {
      throw new NotFoundError('供应商配置不存在');
    }

    if (provider.status !== 1) {
      throw new Error('供应商已停用，无法获取模型列表');
    }

    try {
      const strategy = getProviderStrategy(
        provider.type,
        provider.endpoint,
        provider.api_key,
        provider.provider_config || {}
      );

      const models = await strategy.fetchModels();
      logger.info('成功获取供应商模型列表', { 
        providerId: id, 
        type: provider.type, 
        modelCount: models.length 
      });

      return models;
    } catch (error: any) {
      logger.error('获取供应商模型列表失败', { 
        providerId: id, 
        type: provider.type, 
        error: error.message 
      });
      throw error;
    }
  }

  async getSetting<T = any>(type: SettingType): Promise<SystemSetting<T> | null> {
    const rows = await query('SELECT type, payload, updated_by, updated_at FROM system_settings WHERE type = ? LIMIT 1', [type]);
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const payloadRaw = row.payload;
    let payload: T | null = null;

    try {
      payload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw;
    } catch (error) {
      logger.warn('解析系统设置payload失败', { type, error });
      payload = null;
    }

    return {
      type: row.type,
      payload: (payload ?? {}) as T,
      updated_by: row.updated_by ?? null,
      updated_at: row.updated_at,
    };
  }

  async saveSetting<T = any>(type: SettingType, payload: T, userId: number | null): Promise<SystemSetting<T>> {
    const payloadStr = JSON.stringify(payload ?? {});

    await query(
      `INSERT INTO system_settings (type, payload, updated_by, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         payload = VALUES(payload),
         updated_by = VALUES(updated_by),
         updated_at = NOW()`,
      [type, payloadStr, userId]
    );

    const saved = await this.getSetting<T>(type);
    if (!saved) {
      throw new Error('保存系统设置失败');
    }

    logger.info('系统设置更新成功', { type, userId });
    return saved;
  }
}

export const systemService = new SystemService();
