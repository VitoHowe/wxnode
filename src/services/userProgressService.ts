import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/middleware/errorHandler';

// 学习进度接口
interface StudyProgress {
  id: number;
  user_id: number;
  bank_id: number;
  parse_result_id: number | null;
  current_question_index: number;
  completed_count: number;
  total_questions: number;
  last_study_time: string;
  created_at: string;
  updated_at: string;
  bank_name?: string;
  file_name?: string;
  progress_percentage?: number;
}

// 更新进度参数
interface UpdateProgressParams {
  parse_result_id?: number;
  current_question_index: number;
  completed_count?: number;
  total_questions: number;
}

class UserProgressService {
  /**
   * 获取用户在指定题库的学习进度
   */
  async getUserProgress(userId: number, bankId: number): Promise<StudyProgress | null> {
    try {
      const sql = `
        SELECT 
          usp.*,
          qb.name as bank_name,
          qb.file_original_name as file_name
        FROM user_study_progress usp
        LEFT JOIN question_banks qb ON usp.bank_id = qb.id
        WHERE usp.user_id = ? AND usp.bank_id = ?
      `;
      
      const results = await query(sql, [userId, bankId]);
      
      if (results.length === 0) {
        return null;
      }

      const progress = results[0];
      
      // 计算进度百分比
      const progressPercentage = progress.total_questions > 0 
        ? Math.round((progress.completed_count / progress.total_questions) * 100)
        : 0;

      return {
        ...progress,
        progress_percentage: progressPercentage
      };
    } catch (error) {
      logger.error('获取用户学习进度失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户所有学习进度
   */
  async getAllUserProgress(userId: number): Promise<StudyProgress[]> {
    try {
      const sql = `
        SELECT 
          usp.*,
          qb.name as bank_name,
          qb.file_original_name as file_name
        FROM user_study_progress usp
        LEFT JOIN question_banks qb ON usp.bank_id = qb.id
        WHERE usp.user_id = ?
        ORDER BY usp.last_study_time DESC
      `;
      
      const results = await query(sql, [userId]);
      
      return results.map((progress: any) => {
        const progressPercentage = progress.total_questions > 0 
          ? Math.round((progress.completed_count / progress.total_questions) * 100)
          : 0;

        return {
          ...progress,
          progress_percentage: progressPercentage
        };
      });
    } catch (error) {
      logger.error('获取用户所有学习进度失败:', error);
      throw error;
    }
  }

  /**
   * 保存/更新学习进度
   */
  async saveProgress(
    userId: number, 
    bankId: number, 
    params: UpdateProgressParams
  ): Promise<StudyProgress> {
    try {
      const {
        parse_result_id,
        current_question_index,
        completed_count,
        total_questions
      } = params;

      // 检查是否已存在进度记录
      const existing = await this.getUserProgress(userId, bankId);

      if (existing) {
        // 更新现有记录
        const sql = `
          UPDATE user_study_progress 
          SET 
            parse_result_id = ?,
            current_question_index = ?,
            completed_count = ?,
            total_questions = ?,
            last_study_time = NOW(),
            updated_at = NOW()
          WHERE user_id = ? AND bank_id = ?
        `;
        
        await query(sql, [
          parse_result_id || existing.parse_result_id,
          current_question_index,
          completed_count !== undefined ? completed_count : existing.completed_count,
          total_questions,
          userId,
          bankId
        ]);

        logger.info(`更新学习进度成功: UserID=${userId}, BankID=${bankId}, Index=${current_question_index}`);
      } else {
        // 创建新记录
        const sql = `
          INSERT INTO user_study_progress 
          (user_id, bank_id, parse_result_id, current_question_index, completed_count, total_questions, last_study_time)
          VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await query(sql, [
          userId,
          bankId,
          parse_result_id || null,
          current_question_index,
          completed_count || 0,
          total_questions
        ]);

        logger.info(`创建学习进度成功: UserID=${userId}, BankID=${bankId}`);
      }

      // 返回更新后的进度
      const updated = await this.getUserProgress(userId, bankId);
      return updated!;
    } catch (error) {
      logger.error('保存学习进度失败:', error);
      throw error;
    }
  }

  /**
   * 重置题库学习进度
   */
  async resetProgress(userId: number, bankId: number): Promise<void> {
    try {
      const existing = await this.getUserProgress(userId, bankId);
      
      if (!existing) {
        throw new NotFoundError('学习进度不存在');
      }

      await query(
        'DELETE FROM user_study_progress WHERE user_id = ? AND bank_id = ?',
        [userId, bankId]
      );
      
      logger.info(`重置学习进度成功: UserID=${userId}, BankID=${bankId}`);
    } catch (error) {
      logger.error('重置学习进度失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户最近学习的题库
   */
  async getRecentStudyBanks(userId: number, limit: number = 5): Promise<StudyProgress[]> {
    try {
      const sql = `
        SELECT 
          usp.*,
          qb.name as bank_name,
          qb.file_original_name as file_name
        FROM user_study_progress usp
        LEFT JOIN question_banks qb ON usp.bank_id = qb.id
        WHERE usp.user_id = ?
        ORDER BY usp.last_study_time DESC
        LIMIT ?
      `;
      
      const results = await query(sql, [userId, limit]);
      
      return results.map((progress: any) => {
        const progressPercentage = progress.total_questions > 0 
          ? Math.round((progress.completed_count / progress.total_questions) * 100)
          : 0;

        return {
          ...progress,
          progress_percentage: progressPercentage
        };
      });
    } catch (error) {
      logger.error('获取最近学习题库失败:', error);
      throw error;
    }
  }
}

export const userProgressService = new UserProgressService();



