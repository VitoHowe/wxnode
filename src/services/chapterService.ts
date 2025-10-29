import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/middleware/errorHandler';

// 章节接口
interface Chapter {
  id: number;
  bank_id: number;
  chapter_name: string;
  chapter_order: number;
  question_count: number;
  created_at: string;
  updated_at: string;
}

class ChapterService {
  /**
   * 获取题库的所有章节
   */
  async getChaptersByBankId(bankId: number): Promise<Chapter[]> {
    try {
      const sql = `
        SELECT * FROM question_chapters 
        WHERE bank_id = ? 
        ORDER BY chapter_order ASC
      `;
      
      const chapters = await query(sql, [bankId]);
      
      logger.info('获取题库章节成功', {
        bankId,
        chapterCount: chapters.length,
      });
      
      return chapters as Chapter[];
    } catch (error) {
      logger.error('获取题库章节失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取章节
   */
  async getChapterById(chapterId: number): Promise<Chapter | null> {
    try {
      const sql = 'SELECT * FROM question_chapters WHERE id = ? LIMIT 1';
      const chapters = await query(sql, [chapterId]);
      
      if (chapters.length === 0) {
        return null;
      }
      
      return chapters[0] as Chapter;
    } catch (error) {
      logger.error('根据ID获取章节失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定题库的指定章节（验证归属关系）
   */
  async getChapterByBankIdAndChapterId(bankId: number, chapterId: number): Promise<Chapter | null> {
    try {
      const sql = 'SELECT * FROM question_chapters WHERE id = ? AND bank_id = ? LIMIT 1';
      const chapters = await query(sql, [chapterId, bankId]);
      
      if (chapters.length === 0) {
        return null;
      }
      
      logger.info('获取章节成功', { bankId, chapterId });
      return chapters[0] as Chapter;
    } catch (error) {
      logger.error('获取章节失败:', error);
      throw error;
    }
  }

  /**
   * 创建章节
   */
  async createChapter(
    bankId: number,
    chapterName: string,
    chapterOrder: number
  ): Promise<Chapter> {
    try {
      const sql = `
        INSERT INTO question_chapters (bank_id, chapter_name, chapter_order, question_count)
        VALUES (?, ?, ?, 0)
      `;
      
      const result = await query(sql, [bankId, chapterName, chapterOrder]);
      
      const chapter = await this.getChapterById(result.insertId);
      if (!chapter) {
        throw new Error('创建章节后获取失败');
      }
      
      logger.info('创建章节成功', {
        chapterId: chapter.id,
        bankId,
        chapterName,
      });
      
      return chapter;
    } catch (error: any) {
      // 处理唯一键冲突（章节名称重复）
      if (error.code === 'ER_DUP_ENTRY') {
        logger.warn('章节已存在，尝试获取现有章节', { bankId, chapterName });
        const existingSql = `
          SELECT * FROM question_chapters 
          WHERE bank_id = ? AND chapter_name = ? 
          LIMIT 1
        `;
        const existing = await query(existingSql, [bankId, chapterName]);
        if (existing.length > 0) {
          return existing[0] as Chapter;
        }
      }
      
      logger.error('创建章节失败:', error);
      throw error;
    }
  }

  /**
   * 更新章节题目数量
   */
  async updateChapterQuestionCount(chapterId: number, count: number): Promise<void> {
    try {
      const sql = `
        UPDATE question_chapters 
        SET question_count = ?, updated_at = NOW() 
        WHERE id = ?
      `;
      
      await query(sql, [count, chapterId]);
      
      logger.debug('更新章节题目数量', { chapterId, count });
    } catch (error) {
      logger.error('更新章节题目数量失败:', error);
      throw error;
    }
  }

  /**
   * 重新计算章节题目数量
   */
  async recalculateChapterQuestionCount(chapterId: number): Promise<number> {
    try {
      const countSql = `
        SELECT COUNT(*) as count 
        FROM questions 
        WHERE chapter_id = ?
      `;
      
      const result = await query(countSql, [chapterId]);
      const count = result[0].count;
      
      await this.updateChapterQuestionCount(chapterId, count);
      
      return count;
    } catch (error) {
      logger.error('重新计算章节题目数量失败:', error);
      throw error;
    }
  }

  /**
   * 删除章节（级联删除题目）
   */
  async deleteChapter(chapterId: number): Promise<void> {
    try {
      const chapter = await this.getChapterById(chapterId);
      if (!chapter) {
        throw new NotFoundError('章节不存在');
      }
      
      await query('DELETE FROM question_chapters WHERE id = ?', [chapterId]);
      
      logger.info('删除章节成功', { chapterId });
    } catch (error) {
      logger.error('删除章节失败:', error);
      throw error;
    }
  }

  /**
   * 获取题库章节统计
   */
  async getBankChapterStats(bankId: number): Promise<{
    totalChapters: number;
    totalQuestions: number;
    chapters: Array<{ name: string; count: number }>;
  }> {
    try {
      const sql = `
        SELECT 
          chapter_name as name,
          question_count as count
        FROM question_chapters 
        WHERE bank_id = ? 
        ORDER BY chapter_order ASC
      `;
      
      const chapters = await query(sql, [bankId]);
      
      const totalChapters = chapters.length;
      const totalQuestions = chapters.reduce((sum: number, ch: any) => sum + ch.count, 0);
      
      return {
        totalChapters,
        totalQuestions,
        chapters: chapters as Array<{ name: string; count: number }>,
      };
    } catch (error) {
      logger.error('获取题库章节统计失败:', error);
      throw error;
    }
  }
}

export const chapterService = new ChapterService();
