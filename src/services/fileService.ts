import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/middleware/errorHandler';
import fs from 'fs';
import path from 'path';

// 文件接口
interface QuestionBank {
  id: number;
  name: string;
  description?: string;
  file_original_name: string;
  file_path: string;
  file_size: number;
  parse_status: 'pending' | 'parsing' | 'completed' | 'failed';
  parse_method?: string;
  total_questions: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

// 上传文件参数
interface UploadFileParams {
  file: Express.Multer.File;
  name: string;
  description?: string;
  userId: number;
}

// 查询文件参数
interface GetFilesParams {
  page: number;
  limit: number;
  status?: string;
  userId?: number;
}

class FileService {
  /**
   * 上传文件
   */
  async uploadFile(params: UploadFileParams): Promise<QuestionBank> {
    const { file, name, description, userId } = params;

    try {
      const sql = `
        INSERT INTO question_banks (name, description, file_original_name, file_path, file_size, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const result = await query(sql, [
        name,
        description,
        file.originalname,
        file.path,
        file.size,
        userId,
      ]);
      
      const newFile = await this.getFileById(result.insertId);
      if (!newFile) {
        throw new Error('上传文件后获取文件信息失败');
      }

      logger.info(`文件上传成功: ID=${newFile.id}, 文件名=${file.originalname}`);
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
    const { page, limit, status, userId } = params;
    const offset = (page - 1) * limit;

    try {
      // 构建查询条件
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (status) {
        whereConditions.push('parse_status = ?');
        queryParams.push(status);
      }

      if (userId) {
        whereConditions.push('created_by = ?');
        queryParams.push(userId);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 获取总数
      const countSql = `SELECT COUNT(*) as total FROM question_banks ${whereClause}`;
      const countResult = await query(countSql, queryParams);
      const total = countResult[0].total;

      // 获取文件列表
      const sql = `
        SELECT qb.*, u.nickname as creator_name
        FROM question_banks qb 
        LEFT JOIN users u ON qb.created_by = u.id 
        ${whereClause}
        ORDER BY qb.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const files = await query(sql, [...queryParams, limit, offset]);

      return {
        files,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
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
      return files.length > 0 ? files[0] : null;
    } catch (error) {
      logger.error('根据ID获取文件失败:', error);
      throw error;
    }
  }

  /**
   * 解析文件
   */
  async parseFile(id: number): Promise<{ message: string; taskId: string }> {
    try {
      // 检查文件是否存在
      const file = await this.getFileById(id);
      if (!file) {
        throw new NotFoundError('文件不存在');
      }

      // 检查文件状态
      if (file.parse_status === 'parsing') {
        return { message: '文件正在解析中', taskId: '' };
      }

      if (file.parse_status === 'completed') {
        return { message: '文件已解析完成', taskId: '' };
      }

      // 更新状态为解析中
      await query('UPDATE question_banks SET parse_status = ?, updated_at = NOW() WHERE id = ?', ['parsing', id]);

      // TODO: 这里应该调用Python解析服务
      // 暂时模拟异步解析任务
      const taskId = `task_${id}_${Date.now()}`;
      
      // 模拟异步解析（实际应该调用解析服务）
      this.simulateParseTask(id, file.file_path);

      logger.info(`文件解析任务已启动: ID=${id}, TaskID=${taskId}`);
      return { message: '解析任务已启动', taskId };
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
  async deleteFile(id: number): Promise<void> {
    try {
      // 检查文件是否存在
      const file = await this.getFileById(id);
      if (!file) {
        throw new NotFoundError('文件不存在');
      }

      // 删除数据库记录（级联删除相关题目）
      await query('DELETE FROM question_banks WHERE id = ?', [id]);

      // 删除物理文件
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
  async updateParseStatus(id: number, status: string, data?: any): Promise<void> {
    try {
      const updateData: any = {
        parse_status: status,
        updated_at: new Date(),
      };

      if (data) {
        if (data.total_questions) updateData.total_questions = data.total_questions;
        if (data.parse_method) updateData.parse_method = data.parse_method;
      }

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      values.push(id);

      await query(`UPDATE question_banks SET ${setClause} WHERE id = ?`, values);

      logger.info(`文件解析状态更新: ID=${id}, Status=${status}`);
    } catch (error) {
      logger.error('更新文件解析状态失败:', error);
      throw error;
    }
  }

  /**
   * 模拟解析任务（实际应该调用Python服务）
   */
  private async simulateParseTask(id: number, filePath: string): Promise<void> {
    // 模拟异步解析过程
    setTimeout(async () => {
      try {
        // 模拟解析成功
        await this.updateParseStatus(id, 'completed', {
          total_questions: Math.floor(Math.random() * 100) + 1,
          parse_method: 'text_extraction',
        });

        // 记录解析日志
        await query(`
          INSERT INTO parse_logs (bank_id, status, method, total_pages, parsed_pages, accuracy_score, processing_time, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [id, 'success', 'text_extraction', 10, 10, 0.95, 30]);

        logger.info(`模拟解析完成: ID=${id}`);
      } catch (error) {
        logger.error(`模拟解析失败: ID=${id}`, error);
        await this.updateParseStatus(id, 'failed');
      }
    }, 5000); // 5秒后完成解析
  }
}

export const fileService = new FileService();
