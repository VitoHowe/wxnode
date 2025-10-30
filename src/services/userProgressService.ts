import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/middleware/errorHandler';

// 学习进度接口
interface StudyProgress {
  id: number;
  user_id: number;
  bank_id: number;
  practice_mode: 'chapter' | 'full'; // 练习模式：章节练习 | 整卷练习
  chapter_id: number | null;
  current_chapter_id: number | null; // 当前所在章节ID（整卷练习时使用）
  parse_result_id: number | null;
  current_question_index: number;
  current_question_number: number | null;
  completed_count: number;
  total_questions: number;
  last_study_time: string;
  created_at: string;
  updated_at: string;
  bank_name?: string;
  chapter_name?: string;
  file_name?: string;
  progress_percentage?: number;
}

// 更新进度参数
interface UpdateProgressParams {
  practice_mode?: 'chapter' | 'full'; // 练习模式
  chapter_id?: number; // 章节练习：目标章节ID | 整卷练习：当前所在章节ID
  parse_result_id?: number;
  current_question_index?: number;
  current_question_number?: number;
  completed_count?: number;
  total_questions: number;
}

class UserProgressService {
  /**
   * 获取用户在指定章节的学习进度（章节练习模式）
   */
  async getChapterProgress(userId: number, bankId: number, chapterId: number): Promise<StudyProgress | null> {
    try {
      const sql = `
        SELECT 
          usp.*,
          qb.name as bank_name,
          qc.chapter_name,
          qb.file_original_name as file_name
        FROM user_study_progress usp
        LEFT JOIN question_banks qb ON usp.bank_id = qb.id
        LEFT JOIN question_chapters qc ON usp.chapter_id = qc.id
        WHERE usp.user_id = ? AND usp.bank_id = ? AND usp.chapter_id = ? AND usp.practice_mode = 'chapter'
      `;
      
      const results = await query(sql, [userId, bankId, chapterId]);
      
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
      logger.error('获取章节学习进度失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户在题库所有章节的进度（仅章节练习模式）
   */
  async getBankChaptersProgress(userId: number, bankId: number): Promise<StudyProgress[]> {
    try {
      const sql = `
        SELECT 
          usp.*,
          qb.name as bank_name,
          qc.chapter_name,
          qc.chapter_order,
          qb.file_original_name as file_name
        FROM user_study_progress usp
        LEFT JOIN question_banks qb ON usp.bank_id = qb.id
        LEFT JOIN question_chapters qc ON usp.chapter_id = qc.id
        WHERE usp.user_id = ? AND usp.bank_id = ? AND usp.practice_mode = 'chapter' AND usp.chapter_id IS NOT NULL
        ORDER BY qc.chapter_order ASC
      `;
      
      const results = await query(sql, [userId, bankId]);
      
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
      logger.error('获取题库章节进度失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户整卷练习进度
   */
  async getFullBankProgress(userId: number, bankId: number): Promise<StudyProgress | null> {
    try {
      const sql = `
        SELECT 
          usp.*,
          qb.name as bank_name,
          qc.chapter_name,
          qb.file_original_name as file_name
        FROM user_study_progress usp
        LEFT JOIN question_banks qb ON usp.bank_id = qb.id
        LEFT JOIN question_chapters qc ON usp.current_chapter_id = qc.id
        WHERE usp.user_id = ? AND usp.bank_id = ? AND usp.practice_mode = 'full' AND usp.chapter_id IS NULL
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
      logger.error('获取整卷练习进度失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户在指定题库的学习进度（题库级别，兼容旧接口）
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
        WHERE usp.user_id = ? AND usp.bank_id = ? AND usp.chapter_id IS NULL
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
   * 保存/更新学习进度（支持章节级别和整卷练习）
   */
  async saveProgress(
    userId: number, 
    bankId: number, 
    params: UpdateProgressParams
  ): Promise<StudyProgress> {
    try {
      const {
        practice_mode = 'chapter',
        chapter_id,
        parse_result_id,
        current_question_index,
        current_question_number,
        completed_count,
        total_questions
      } = params;

      // 整卷练习：chapter_id = NULL, current_chapter_id = 实际章节ID
      // 章节练习：chapter_id = 实际章节ID, current_chapter_id = NULL
      const finalChapterId = practice_mode === 'full' ? null : (chapter_id || null);
      const currentChapterId = practice_mode === 'full' ? (chapter_id || null) : null;

      // 检查是否已存在进度记录
      let existing: StudyProgress | null = null;
      if (practice_mode === 'full') {
        existing = await this.getFullBankProgress(userId, bankId);
      } else if (finalChapterId) {
        existing = await this.getChapterProgress(userId, bankId, finalChapterId);
      } else {
        existing = await this.getUserProgress(userId, bankId);
      }

      if (existing) {
        // 更新现有记录
        // 确保 completed_count 和 current_question_number 保持一致
        const finalQuestionNumber = current_question_number !== undefined ? current_question_number : existing.current_question_number;
        const finalCompletedCount = completed_count !== undefined ? completed_count : finalQuestionNumber;
        
        // 构建 WHERE 条件：章节练习需要指定 chapter_id，整卷练习需要 chapter_id IS NULL
        const whereCondition = practice_mode === 'full'
          ? 'WHERE user_id = ? AND bank_id = ? AND practice_mode = ? AND chapter_id IS NULL'
          : 'WHERE user_id = ? AND bank_id = ? AND practice_mode = ? AND chapter_id = ?';
        
        const sql = `
          UPDATE user_study_progress 
          SET 
            current_chapter_id = ?,
            parse_result_id = ?,
            current_question_index = ?,
            current_question_number = ?,
            completed_count = ?,
            total_questions = ?,
            last_study_time = NOW(),
            updated_at = NOW()
          ${whereCondition}
        `;
        
        const queryParams = [
          currentChapterId,
          parse_result_id !== undefined ? parse_result_id : existing.parse_result_id,
          current_question_index !== undefined ? current_question_index : existing.current_question_index,
          finalQuestionNumber,
          finalCompletedCount,
          total_questions,
          userId,
          bankId,
          practice_mode
        ];
        
        // 章节练习需要添加 chapter_id 到 WHERE 条件
        if (practice_mode === 'chapter' && finalChapterId) {
          queryParams.push(finalChapterId);
        }
        
        await query(sql, queryParams);

        logger.info(`更新学习进度成功: UserID=${userId}, BankID=${bankId}, Mode=${practice_mode}, ChapterID=${finalChapterId || 'NULL'}, CurrentChapterID=${currentChapterId || 'NULL'}, QuestionNumber=${finalQuestionNumber}, CompletedCount=${finalCompletedCount}`);
      } else {
        // 创建新记录
        // 确保 completed_count 和 current_question_number 保持一致
        const finalQuestionNumber = current_question_number || null;
        const finalCompletedCount = completed_count !== undefined ? completed_count : (finalQuestionNumber || 0);
        
        const sql = `
          INSERT INTO user_study_progress 
          (user_id, bank_id, practice_mode, chapter_id, current_chapter_id, parse_result_id, current_question_index, current_question_number, completed_count, total_questions, last_study_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await query(sql, [
          userId,
          bankId,
          practice_mode,
          finalChapterId,
          currentChapterId,
          parse_result_id || null,
          current_question_index || 0,
          finalQuestionNumber,
          finalCompletedCount,
          total_questions
        ]);

        logger.info(`创建学习进度成功: UserID=${userId}, BankID=${bankId}, Mode=${practice_mode}, ChapterID=${finalChapterId || 'NULL'}, CurrentChapterID=${currentChapterId || 'NULL'}, QuestionNumber=${finalQuestionNumber}, CompletedCount=${finalCompletedCount}`);
      }

      // 返回更新后的进度
      if (practice_mode === 'full') {
        const updated = await this.getFullBankProgress(userId, bankId);
        return updated!;
      } else if (finalChapterId) {
        const updated = await this.getChapterProgress(userId, bankId, finalChapterId);
        return updated!;
      } else {
        const updated = await this.getUserProgress(userId, bankId);
        return updated!;
      }
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

