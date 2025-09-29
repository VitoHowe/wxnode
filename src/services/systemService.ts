import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { ConflictError, NotFoundError } from '@/middleware/errorHandler';

export interface ModelConfig {
  id: number;
  name: string;
  endpoint: string;
  api_key: string;
  description: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}

interface CreateModelConfigParams {
  name: string;
  endpoint: string;
  api_key: string;
  description?: string | null;
  status?: number;
}

interface UpdateModelConfigParams {
  name?: string;
  endpoint?: string;
  api_key?: string;
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
  async listModelConfigs(): Promise<ModelConfig[]> {
    const rows = await query('SELECT * FROM model_configs ORDER BY created_at DESC');
    return rows;
  }

  async getModelConfigById(id: number): Promise<ModelConfig | null> {
    const rows = await query('SELECT * FROM model_configs WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async createModelConfig(params: CreateModelConfigParams): Promise<ModelConfig> {
    const { name, endpoint, api_key, description = null, status = 1 } = params;
    const normalizedDescription = description === '' ? null : description;
    const normalizedStatus = typeof status === 'number' ? status : 1;

    try {
      const result = await query(
        `INSERT INTO model_configs (name, endpoint, api_key, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [name, endpoint, api_key, normalizedDescription, normalizedStatus]
      );

      const created = await this.getModelConfigById(result.insertId);
      if (!created) {
        throw new Error('创建模型配置后查询失败');
      }

      logger.info('模型配置创建成功', { modelId: created.id, name: created.name });
      return created;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('模型名称已存在');
      }
      logger.error('创建模型配置失败', error);
      throw error;
    }
  }

  async updateModelConfig(id: number, params: UpdateModelConfigParams): Promise<ModelConfig> {
    const existing = await this.getModelConfigById(id);
    if (!existing) {
      throw new NotFoundError('模型配置不存在');
    }

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        let normalizedValue = value;
        if (key === 'description' && value === '') {
          normalizedValue = null;
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
      await query(`UPDATE model_configs SET ${fields.join(', ')} WHERE id = ?`, values);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('模型名称已存在');
      }
      logger.error('更新模型配置失败', error);
      throw error;
    }

    const updated = await this.getModelConfigById(id);
    if (!updated) {
      throw new NotFoundError('模型配置不存在');
    }

    logger.info('模型配置更新成功', { modelId: id });
    return updated;
  }

  async deleteModelConfig(id: number): Promise<void> {
    const existing = await this.getModelConfigById(id);
    if (!existing) {
      throw new NotFoundError('模型配置不存在');
    }

    await query('DELETE FROM model_configs WHERE id = ?', [id]);
    logger.info('模型配置已删除', { modelId: id });
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
