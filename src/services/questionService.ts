import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { replaceQuestionImages } from '@/utils/imageParser';
import { NotFoundError } from '@/middleware/errorHandler';

// 题目接口
interface Question {
  id: number;
  bank_id: number;
  chapter_id?: number;
  question_no?: string;
  type: 'single' | 'multiple' | 'judge' | 'fill' | 'essay';
  content: string;
  options?: any;
  answer: string;
  explanation?: string;
  difficulty: number;
  tags?: any;
  page_number?: number;
  confidence_score?: number;
  created_at: Date;
}

// 题库接口
interface QuestionBank {
  id: number;
  name: string;
  description?: string;
  total_questions: number;
  created_by: number;
  created_at: Date;
}

// 查询题目参数
interface GetQuestionsParams {
  bank_id?: number;
  type?: string;
  difficulty?: number;
  keyword?: string;
  page: number;
  limit: number;
}

// 查询题库参数
interface GetQuestionBanksParams {
  page: number;
  limit: number;
}

// 更新题目参数
interface UpdateQuestionParams {
  content?: string;
  options?: any;
  answer?: string;
  explanation?: string;
  difficulty?: number;
  tags?: any;
}

class QuestionService {
  /**
   * 获取题目列表
   */
  async getQuestions(params: GetQuestionsParams): Promise<{ questions: Question[]; total: number; pagination: any }> {
    const { bank_id, type, difficulty, keyword, page, limit } = params;
    const offset = (page - 1) * limit;

    try {
      // 构建查询条件
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (bank_id) {
        whereConditions.push('q.bank_id = ?');
        queryParams.push(bank_id);
      }

      if (type) {
        whereConditions.push('q.type = ?');
        queryParams.push(type);
      }

      if (difficulty) {
        whereConditions.push('q.difficulty = ?');
        queryParams.push(difficulty);
      }

      if (keyword) {
        whereConditions.push('(q.content LIKE ? OR q.answer LIKE ? OR q.explanation LIKE ?)');
        queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 获取总数
      const countSql = `SELECT COUNT(*) as total FROM questions q ${whereClause}`;
      const countResult = await query(countSql, queryParams);
      const total = countResult[0].total;

      // 获取题目列表
      const sql = `
        SELECT q.*, qb.name as bank_name
        FROM questions q 
        LEFT JOIN question_banks qb ON q.bank_id = qb.id 
        ${whereClause}
        ORDER BY q.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const questions = await query(sql, [...queryParams, limit, offset]);

      return {
        questions,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('获取题目列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取题目
   */
  async getQuestionById(id: number): Promise<Question | null> {
    try {
      const sql = `
        SELECT q.*, qb.name as bank_name
        FROM questions q 
        LEFT JOIN question_banks qb ON q.bank_id = qb.id 
        WHERE q.id = ? LIMIT 1
      `;
      const questions = await query(sql, [id]);
      return questions.length > 0 ? questions[0] : null;
    } catch (error) {
      logger.error('根据ID获取题目失败:', error);
      throw error;
    }
  }

  /**
   * 获取题库列表
   */
  async getQuestionBanks(params: GetQuestionBanksParams): Promise<{ banks: QuestionBank[]; total: number; pagination: any }> {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    try {
      // 获取总数
      const countSql = `SELECT COUNT(*) as total FROM question_banks WHERE parse_status = ?`;
      const countResult = await query(countSql, ['completed']);
      const total = countResult[0].total;

      // 获取题库列表（使用 LEFT JOIN 替代子查询）
      const sql = `
        SELECT 
          qb.id,
          qb.name,
          qb.description,
          qb.file_type,
          qb.file_original_name,
          qb.file_path,
          qb.file_size,
          qb.parse_status,
          qb.created_by,
          qb.created_at,
          qb.updated_at,
          u.nickname as creator_name,
          COUNT(q.id) as question_count
        FROM question_banks qb 
        LEFT JOIN users u ON qb.created_by = u.id
        LEFT JOIN questions q ON q.bank_id = qb.id
        WHERE qb.parse_status = ?
        GROUP BY qb.id, qb.name, qb.description, qb.file_type, qb.file_original_name, 
                 qb.file_path, qb.file_size, qb.parse_status, qb.created_by, 
                 qb.created_at, qb.updated_at, u.nickname
        ORDER BY qb.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const banks = await query(sql, ['completed', limit, offset]);

      return {
        banks,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('获取题库列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取题库
   */
  async getQuestionBankById(id: number): Promise<any> {
    try {
      const sql = `
        SELECT qb.*, u.nickname as creator_name
        FROM question_banks qb 
        LEFT JOIN users u ON qb.created_by = u.id 
        WHERE qb.id = ? LIMIT 1
      `;
      const banks = await query(sql, [id]);
      
      if (banks.length === 0) {
        return null;
      }

      const bank = banks[0];

      // 获取题目统计信息
      const statsSql = `
        SELECT 
          COUNT(*) as total_questions,
          COUNT(CASE WHEN type = 'single' THEN 1 END) as single_choice,
          COUNT(CASE WHEN type = 'multiple' THEN 1 END) as multiple_choice,
          COUNT(CASE WHEN type = 'judge' THEN 1 END) as judge,
          COUNT(CASE WHEN type = 'fill' THEN 1 END) as fill,
          COUNT(CASE WHEN type = 'essay' THEN 1 END) as essay,
          COUNT(CASE WHEN difficulty = 1 THEN 1 END) as easy,
          COUNT(CASE WHEN difficulty = 2 THEN 1 END) as medium,
          COUNT(CASE WHEN difficulty = 3 THEN 1 END) as hard,
          AVG(confidence_score) as avg_confidence
        FROM questions 
        WHERE bank_id = ?
      `;
      
      const statsResult = await query(statsSql, [id]);
      const stats = statsResult[0];

      return {
        ...bank,
        statistics: stats,
      };
    } catch (error) {
      logger.error('根据ID获取题库失败:', error);
      throw error;
    }
  }

  /**
   * 更新题目
   */
  async updateQuestion(id: number, params: UpdateQuestionParams): Promise<Question> {
    try {
      // 检查题目是否存在
      const existingQuestion = await this.getQuestionById(id);
      if (!existingQuestion) {
        throw new NotFoundError('题目不存在');
      }

      // 构建更新SQL
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      if (updateFields.length === 0) {
        return existingQuestion;
      }

      updateValues.push(id);

      const sql = `UPDATE questions SET ${updateFields.join(', ')} WHERE id = ?`;
      await query(sql, updateValues);

      const updatedQuestion = await this.getQuestionById(id);
      if (!updatedQuestion) {
        throw new Error('更新题目后获取题目信息失败');
      }

      logger.info(`题目更新成功: ID=${id}`);
      return updatedQuestion;
    } catch (error) {
      logger.error('更新题目失败:', error);
      throw error;
    }
  }

  /**
   * 删除题目
   */
  async deleteQuestion(id: number): Promise<void> {
    try {
      // 检查题目是否存在
      const existingQuestion = await this.getQuestionById(id);
      if (!existingQuestion) {
        throw new NotFoundError('题目不存在');
      }

      // 删除题目
      await query('DELETE FROM questions WHERE id = ?', [id]);

      // 更新题库的题目数量
      await this.updateBankQuestionCount(existingQuestion.bank_id);

      logger.info(`题目删除成功: ID=${id}`);
    } catch (error) {
      logger.error('删除题目失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建题目
   */
  async createQuestions(bankId: number, questions: any[]): Promise<void> {
    try {
      const sql = `
        INSERT INTO questions (bank_id, type, content, options, answer, explanation, difficulty, tags, page_number, confidence_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      for (const question of questions) {
        await query(sql, [
          bankId,
          question.type,
          question.content,
          JSON.stringify(question.options || null),
          question.answer,
          question.explanation || null,
          question.difficulty || 1,
          JSON.stringify(question.tags || null),
          question.page_number || null,
          question.confidence_score || null,
        ]);
      }

      // 更新题库的题目数量
      await this.updateBankQuestionCount(bankId);

      logger.info(`批量创建题目成功: BankID=${bankId}, Count=${questions.length}`);
    } catch (error) {
      logger.error('批量创建题目失败:', error);
      throw error;
    }
  }

  /**
   * 更新题库题目数量
   */
  private async updateBankQuestionCount(bankId: number): Promise<void> {
    try {
      const countSql = 'SELECT COUNT(*) as count FROM questions WHERE bank_id = ?';
      const countResult = await query(countSql, [bankId]);
      const count = countResult[0].count;

      await query('UPDATE question_banks SET total_questions = ? WHERE id = ?', [count, bankId]);
    } catch (error) {
      logger.error('更新题库题目数量失败:', error);
      throw error;
    }
  }

  /**
   * 随机获取题目
   */
  async getRandomQuestions(bankId: number, count: number, type?: string): Promise<Question[]> {
    try {
      const whereConditions = ['bank_id = ?'];
      const queryParams: any[] = [bankId];

      if (type) {
        whereConditions.push('type = ?');
        queryParams.push(type);
      }

      const sql = `
        SELECT * FROM questions 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY RAND() 
        LIMIT ?
      `;
      
      queryParams.push(count);
      
      const questions = await query(sql, queryParams);
      return questions;
    } catch (error) {
      logger.error('随机获取题目失败:', error);
      throw error;
    }
  }

  /**
   * 根据章节ID获取题目（支持分页、全量、单题模式）
   * @param questionNumber - 题号（从1开始），传入时返回单个题目
   */
  async getQuestionsByChapterId(
    chapterId: number,
    page: number = 1,
    limit: number = 0,  // 默认0表示返回全部
    questionNumber?: number  // 题号，传入时返回单个题目
  ): Promise<{ questions?: Question[]; question?: Question; total: number; pagination?: any; currentNumber?: number; hasNext?: boolean; hasPrev?: boolean }> {
    const chapterIdNum = parseInt(String(chapterId));

    try {
      // 获取总数
      const countSql = 'SELECT COUNT(*) as total FROM questions WHERE chapter_id = ?';
      const countResult = await query(countSql, [chapterIdNum]);
      const total = countResult[0].total;

      // 单题模式
      if (questionNumber !== undefined) {
        const qNum = parseInt(String(questionNumber));
        
        // 检查题号是否超出范围
        if (qNum < 1 || qNum > total) {
          return {
            total,
            currentNumber: qNum
          };
        }

        // 获取指定题号的题目（OFFSET从0开始，所以是qNum-1）
        const sql = `
          SELECT q.*, 
                 qb.name as bank_name,
                 qc.chapter_name
          FROM questions q 
          LEFT JOIN question_banks qb ON q.bank_id = qb.id
          LEFT JOIN question_chapters qc ON q.chapter_id = qc.id
          WHERE q.chapter_id = ?
          ORDER BY CAST(q.question_no AS UNSIGNED) ASC, q.id ASC
          LIMIT 1 OFFSET ${qNum - 1}
        `;
        
        const questions = await query(sql, [chapterIdNum]);
        
        return {
          question: questions[0] || null,
          total,
          currentNumber: qNum,
          hasNext: qNum < total,
          hasPrev: qNum > 1
        };
      }

      let sql: string;
      
      // limit=0 表示获取全部（答题模式）
      if (limit === 0) {
        sql = `
          SELECT q.*, 
                 qb.name as bank_name,
                 qc.chapter_name
          FROM questions q 
          LEFT JOIN question_banks qb ON q.bank_id = qb.id
          LEFT JOIN question_chapters qc ON q.chapter_id = qc.id
          WHERE q.chapter_id = ?
          ORDER BY CAST(q.question_no AS UNSIGNED) ASC, q.id ASC
        `;
      } else {
        // 分页模式（题库管理）
        const offset = (page - 1) * limit;
        const limitNum = Math.min(Math.max(parseInt(String(limit)), 1), 100);
        const offsetNum = Math.max(parseInt(String(offset)), 0);
        
        sql = `
          SELECT q.*, 
                 qb.name as bank_name,
                 qc.chapter_name
          FROM questions q 
          LEFT JOIN question_banks qb ON q.bank_id = qb.id
          LEFT JOIN question_chapters qc ON q.chapter_id = qc.id
          WHERE q.chapter_id = ?
          ORDER BY CAST(q.question_no AS UNSIGNED) ASC, q.id ASC
          LIMIT ${limitNum} OFFSET ${offsetNum}
        `;
      }
      
      const questions = await query(sql, [chapterIdNum]);

      return {
        questions,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('根据章节ID获取题目失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建题目（支持章节）
   */
  async createQuestionsWithChapter(
    bankId: number,
    chapterId: number,
    questions: any[]
  ): Promise<void> {
    try {
      const sql = `
        INSERT INTO questions (
          bank_id, chapter_id, question_no, type, content, 
          options, answer, explanation, difficulty, tags, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      for (const question of questions) {
        await query(sql, [
          bankId,
          chapterId,
          question.question_no || question.question || null,
          question.type,
          question.content,
          question.options ? JSON.stringify(question.options) : null,
          question.answer,
          question.explanation || null,
          question.difficulty || 1,
          question.tags ? JSON.stringify(question.tags) : null,
        ]);
      }

      logger.info('批量创建章节题目成功', {
        bankId,
        chapterId,
        count: questions.length,
      });
    } catch (error) {
      logger.error('批量创建章节题目失败:', error);
      throw error;
    }
  }
}

export const questionService = new QuestionService();
