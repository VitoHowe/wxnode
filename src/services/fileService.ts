import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError, AuthorizationError } from '@/middleware/errorHandler';
import { systemService } from './systemService';
import { getParseStrategy, ParsedQuestion } from './providerStrategies/parseStrategies';
import { FileContentReader } from '@/utils/fileContentReader';
import fs from 'fs';
import path from 'path';

// 文件类型
type FileType = 'question_bank' | 'knowledge_base';

// 文件接口
interface QuestionBank {
  id: number;
  name: string;
  description?: string;
  file_type: FileType;
  file_original_name: string;
  file_path: string;
  file_size: number;
  parse_status: 'pending' | 'parsing' | 'completed' | 'failed';
  parse_method?: string;
  total_questions: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

// 上传文件参数
interface UploadFileParams {
  file: Express.Multer.File;
  name: string;
  description?: string;
  fileType?: FileType;
  userId: number;
}

// 查询文件参数
interface GetFilesParams {
  page: number;
  limit: number;
  status?: string;
  userId?: number;
  startTime?: string;
  endTime?: string;
}

class FileService {
  /**
   * 上传文件
   */
  async uploadFile(params: UploadFileParams): Promise<QuestionBank> {
    const { file, name, description, fileType = 'question_bank', userId } = params;

    try {
      const sql = `
        INSERT INTO question_banks (name, description, file_type, file_original_name, file_path, file_size, parse_status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
      `;

      const result = await query(sql, [name, description || null, fileType, file.originalname, file.path, file.size, userId]);
      
      const newFile = await this.getFileById(result.insertId);
      if (!newFile) {
        throw new Error('上传文件后获取文件信息失败');
      }

      logger.info(`文件上传成功: ID=${newFile.id}, 文件名=${file.originalname}, 类型=${fileType}`);
      return newFile;
    } catch (error) {
      // 如果数据库操作失败，删除已上传的文件
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      logger.error('上传文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件列表
   */
  async getFiles(params: GetFilesParams): Promise<{ files: QuestionBank[]; total: number; pagination: any }> {
    const pageNum = Number(params.page) || 1;
    const limitNum = Number(params.limit) || 20;
    const { status, userId, startTime, endTime } = params;
    const offsetNum = (pageNum - 1) * limitNum;

    try {
      // 构建查询条件
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (status) {
        whereConditions.push('qb.parse_status = ?');
        queryParams.push(status);
      }

      if (userId) {
        whereConditions.push('qb.created_by = ?');
        queryParams.push(userId);
      }

      if (startTime) {
        whereConditions.push('qb.created_at >= ?');
        queryParams.push(startTime);
      }

      if (endTime) {
        whereConditions.push('qb.created_at <= ?');
        queryParams.push(endTime);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 获取总数
      const countSql = `SELECT COUNT(*) as total FROM question_banks qb ${whereClause}`;
      const countResult = await query(countSql, queryParams.length ? queryParams : []);
      const total = countResult[0].total;

      // 获取文件列表（为避免某些 MySQL 版本对 LIMIT/OFFSET 绑定参数报错，这里直接插入已验证的数值）
      const sql = `
        SELECT qb.*, u.nickname as creator_name
        FROM question_banks qb 
        LEFT JOIN users u ON qb.created_by = u.id 
        ${whereClause}
        ORDER BY qb.created_at DESC 
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;
      
      const files = await query(sql, queryParams.length ? queryParams : []);

      const formattedFiles = (files as any[]).map(formatFileRecord);

      return {
        files: formattedFiles,
        total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      logger.error('获取文件列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取文件
   */
  async getFileById(id: number): Promise<QuestionBank | null> {
    try {
      const sql = `
        SELECT qb.*, u.nickname as creator_name
        FROM question_banks qb 
        LEFT JOIN users u ON qb.created_by = u.id 
        WHERE qb.id = ? LIMIT 1
      `;
      const files = await query(sql, [id]);
      if (files.length === 0) {
        return null;
      }

      return formatFileRecord(files[0]);
    } catch (error) {
      logger.error('根据ID获取文件失败:', error);
      throw error;
    }
  }

  /**
   * 解析文件
   */
  async parseFile(id: number, userId: number, providerId: number, modelName: string): Promise<{ message: string; taskId: string }> {
    try {
      // 检查文件是否存在
      const file = await this.getFileById(id);
      if (!file) {
        throw new NotFoundError('文件不存在');
      }

      // 权限检查：仅文件创建者可触发解析
      if (file.created_by !== userId) {
        throw new AuthorizationError('无权解析该文件');
      }

      // 检查文件状态
      if (file.parse_status === 'parsing') {
        return { message: '文件正在解析中', taskId: '' };
      }

      if (file.parse_status === 'completed') {
        return { message: '文件已解析完成', taskId: '' };
      }

      // 获取供应商配置
      const provider = await systemService.getProviderConfigById(providerId);
      if (!provider) {
        throw new NotFoundError('供应商配置不存在');
      }

      if (provider.status !== 1) {
        throw new Error('供应商已停用，无法使用');
      }

      // 更新状态为解析中，记录供应商和模型信息
      await query(
        'UPDATE question_banks SET parse_status = ?, provider_id = ?, model_name = ?, parse_method = ?, updated_at = NOW() WHERE id = ?',
        ['parsing', providerId, modelName, provider.type, id]
      );

      const taskId = `task_${id}_${Date.now()}`;
      
      // 异步执行AI解析任务
      this.executeAIParseTask(id, file.file_path, provider, modelName).catch(error => {
        logger.error('AI解析任务执行失败:', error);
      });

      logger.info(`AI解析任务已启动: ID=${id}, TaskID=${taskId}, Provider=${provider.name}, Model=${modelName}`);
      return { message: 'AI解析任务已启动', taskId };
    } catch (error) {
      logger.error('启动文件解析失败:', error);
      throw error;
    }
  }

  /**
   * 获取解析状态
   */
  async getParseStatus(id: number): Promise<any> {
    try {
      const file = await this.getFileById(id);
      if (!file) {
        throw new NotFoundError('文件不存在');
      }

      // 获取解析日志
      const logSql = `
        SELECT * FROM parse_logs 
        WHERE bank_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const logs = await query(logSql, [id]);
      const latestLog = logs.length > 0 ? logs[0] : null;

      return {
        file_id: id,
        status: file.parse_status,
        total_questions: file.total_questions,
        parse_method: file.parse_method,
        latest_log: latestLog,
      };
    } catch (error) {
      logger.error('获取解析状态失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(id: number, userId: number): Promise<void> {
    try {
      const file = await this.getFileById(id);
      if (!file) {
        throw new NotFoundError('文件不存在');
      }

      if (file.created_by !== userId) {
        throw new AuthorizationError('无权删除该文件');
      }

      await query('DELETE FROM question_banks WHERE id = ?', [id]);

      if (file.file_path && fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }

      logger.info(`文件删除成功: ID=${id}`);
    } catch (error) {
      logger.error('删除文件失败:', error);
      throw error;
    }
  }

  /**
   * 更新文件解析状态
   */
  async updateParseStatus(id: number, status: 'pending' | 'parsing' | 'completed' | 'failed', data?: { total_questions?: number; parse_method?: string }): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        parse_status: status,
        updated_at: new Date(),
      };

      if (data) {
        if (data.total_questions !== undefined) {
          updateData.total_questions = data.total_questions;
        }
        if (data.parse_method !== undefined) {
          updateData.parse_method = data.parse_method;
        }
      }

      const setClause = Object.keys(updateData)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(updateData), id];

      await query(`UPDATE question_banks SET ${setClause} WHERE id = ?`, values);

      logger.info(`文件解析状态更新: ID=${id}, Status=${status}`);
    } catch (error) {
      logger.error('更新文件解析状态失败:', error);
      throw error;
    }
  }

  /**
   * 设置文件解析状态（供 API 调用）
   */
  async setParseStatus(
    id: number,
    status: 'pending' | 'parsing' | 'completed' | 'failed',
    actor: { userId: number; isAdmin: boolean },
    extra?: { total_questions?: number; parse_method?: string }
  ): Promise<QuestionBank> {
    const file = await this.getFileById(id);
    if (!file) {
      throw new NotFoundError('文件不存在');
    }

    if (!actor.isAdmin && file.created_by !== actor.userId) {
      throw new AuthorizationError('无权更新该文件的解析状态');
    }

    await this.updateParseStatus(id, status, extra);

    const updated = await this.getFileById(id);
    if (!updated) {
      throw new NotFoundError('文件不存在');
    }

    return updated;
  }

  /**
   * 执行AI解析任务
   */
  private async executeAIParseTask(id: number, filePath: string, provider: any, modelName: string): Promise<void> {
    try {
      // 获取文件信息（包含file_type）
      const file = await this.getFileById(id);
      if (!file) {
        throw new Error('文件不存在');
      }
      
      // 读取文件内容，根据provider类型和文件类型返回不同格式
      const fileContentResult = await FileContentReader.readFileContent(filePath, provider.type);
      
      // 获取解析策略，传递文件类型
      const strategy = getParseStrategy(provider, modelName, file.file_type);
      
      // 调用AI进行解析，传递文件内容结果
      const result = await strategy.parseFile(fileContentResult, path.basename(filePath));
      
      if (!result.success) {
        // 解析失败
        await query(
          'UPDATE question_banks SET parse_status = ?, updated_at = NOW() WHERE id = ?',
          ['failed', id]
        );
        
        // 记录解析日志
        await query(
          `INSERT INTO parse_logs (bank_id, status, method, error_message, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [id, 'failed', provider.type, result.error]
        );
        
        logger.error('AI解析失败', { fileId: id, error: result.error });
        return;
      }
      
      // 保存解析的题目
      await this.saveQuestions(id, result.questions);
      
      // 更新文件状态为已完成
      await query(
        'UPDATE question_banks SET parse_status = ?, total_questions = ?, updated_at = NOW() WHERE id = ?',
        ['completed', result.totalQuestions, id]
      );
      
      // 记录成功日志
      await query(
        `INSERT INTO parse_logs (bank_id, status, method, total_pages, parsed_pages, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [id, 'success', provider.type, result.totalQuestions, result.totalQuestions]
      );
      
      logger.info('AI解析成功', {
        fileId: id,
        provider: provider.name,
        model: modelName,
        questionCount: result.totalQuestions,
      });
    } catch (error: any) {
      logger.error('AI解析任务执行异常:', error);
      
      await query(
        'UPDATE question_banks SET parse_status = ?, updated_at = NOW() WHERE id = ?',
        ['failed', id]
      );
      
      await query(
        `INSERT INTO parse_logs (bank_id, status, method, error_message, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [id, 'failed', provider.type, error.message]
      );
    }
  }


  /**
   * 保存题目到数据库
   */
  private async saveQuestions(bankId: number, questions: ParsedQuestion[]): Promise<void> {
    for (const question of questions) {
      await query(
        `INSERT INTO questions (bank_id, type, content, options, answer, explanation, difficulty, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          bankId,
          question.type,
          question.content,
          question.options ? JSON.stringify(question.options) : null,
          question.answer,
          question.explanation || null,
          question.difficulty || 1,
          question.tags ? JSON.stringify(question.tags) : null,
        ]
      );
    }
  }

  /**
   * 模拟解析任务（已废弃，保留以防兼容性问题）
   */
  private async simulateParseTask(id: number, filePath: string): Promise<void> {
    setTimeout(async () => {
      try {
        await this.updateParseStatus(id, 'completed', {
          total_questions: Math.floor(Math.random() * 100) + 1,
          parse_method: 'text_extraction',
        });

        await query(`
          INSERT INTO parse_logs (bank_id, status, method, total_pages, parsed_pages, accuracy_score, processing_time, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [id, 'success', 'text_extraction', 10, 10, 0.95, 30]);

        logger.info(`模拟解析完成: ID=${id}`);
      } catch (error) {
        logger.error(`模拟解析失败: ID=${id}`, error);
        await this.updateParseStatus(id, 'failed');
      }
    }, 5000);
  }
}

function formatFileRecord(file: any): QuestionBank {
  return {
    ...file,
    created_at: formatDateTime(file.created_at),
    updated_at: formatDateTime(file.updated_at),
  };
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export const fileService = new FileService();
