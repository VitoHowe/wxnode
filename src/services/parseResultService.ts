import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/middleware/errorHandler';

// 解析结果接口
interface ParseResult {
  id: number;
  bank_id: number;
  questions: any[];
  total_questions: number;
  created_at: string;
  updated_at: string;
  bank_name?: string;
  file_name?: string;
}

class ParseResultService {
  /**
   * 获取所有解析结果列表
   */
  async getAllParseResults(): Promise<ParseResult[]> {
    try {
      const sql = `
        SELECT 
          pr.*,
          qb.name as bank_name,
          qb.file_original_name as file_name
        FROM parse_results pr 
        LEFT JOIN question_banks qb ON pr.bank_id = qb.id 
        ORDER BY pr.created_at DESC
      `;
      
      const results = await query(sql, []);
      
      return results.map((result: any) => ({
        ...result,
        questions: typeof result.questions === 'string' 
          ? JSON.parse(result.questions) 
          : result.questions,
      }));
    } catch (error) {
      logger.error('获取解析结果列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取解析结果
   */
  async getParseResultById(id: number): Promise<ParseResult | null> {
    try {
      const sql = `
        SELECT 
          pr.*,
          qb.name as bank_name,
          qb.file_original_name as file_name
        FROM parse_results pr 
        LEFT JOIN question_banks qb ON pr.bank_id = qb.id 
        WHERE pr.id = ?
      `;
      
      const results = await query(sql, [id]);
      
      if (results.length === 0) {
        return null;
      }

      const result = results[0];
      return {
        ...result,
        questions: typeof result.questions === 'string' 
          ? JSON.parse(result.questions) 
          : result.questions,
      };
    } catch (error) {
      logger.error('根据ID获取解析结果失败:', error);
      throw error;
    }
  }

  /**
   * 根据题库ID获取解析结果
   */
  async getParseResultByBankId(bankId: number): Promise<ParseResult | null> {
    try {
      const sql = `
        SELECT 
          pr.*,
          qb.name as bank_name,
          qb.file_original_name as file_name
        FROM parse_results pr 
        LEFT JOIN question_banks qb ON pr.bank_id = qb.id 
        WHERE pr.bank_id = ?
        ORDER BY pr.created_at DESC
        LIMIT 1
      `;
      
      const results = await query(sql, [bankId]);
      
      if (results.length === 0) {
        return null;
      }

      const result = results[0];
      return {
        ...result,
        questions: typeof result.questions === 'string' 
          ? JSON.parse(result.questions) 
          : result.questions,
      };
    } catch (error) {
      logger.error('根据题库ID获取解析结果失败:', error);
      throw error;
    }
  }

  /**
   * 根据题库ID获取所有解析结果
   */
  async getAllParseResultsByBankId(bankId: number): Promise<ParseResult[]> {
    try {
      const sql = `
        SELECT 
          pr.*,
          qb.name as bank_name,
          qb.file_original_name as file_name
        FROM parse_results pr 
        LEFT JOIN question_banks qb ON pr.bank_id = qb.id 
        WHERE pr.bank_id = ?
        ORDER BY pr.created_at DESC
      `;
      
      const results = await query(sql, [bankId]);
      
      return results.map((result: any) => ({
        ...result,
        questions: typeof result.questions === 'string' 
          ? JSON.parse(result.questions) 
          : result.questions,
      }));
    } catch (error) {
      logger.error('根据题库ID获取所有解析结果失败:', error);
      throw error;
    }
  }

  /**
   * 更新解析结果
   */
  async updateParseResult(id: number, questions: any[]): Promise<ParseResult> {
    try {
      // 先检查记录是否存在
      const existing = await this.getParseResultById(id);
      if (!existing) {
        throw new NotFoundError('解析结果不存在');
      }

      const sql = `
        UPDATE parse_results 
        SET questions = ?, 
            total_questions = ?,
            updated_at = NOW()
        WHERE id = ?
      `;
      
      await query(sql, [
        JSON.stringify(questions),
        questions.length,
        id
      ]);
      
      logger.info(`解析结果更新成功: ID=${id}, 题目数量=${questions.length}`);
      
      // 返回更新后的数据
      const updated = await this.getParseResultById(id);
      return updated!;
    } catch (error) {
      logger.error('更新解析结果失败:', error);
      throw error;
    }
  }

  /**
   * 删除解析结果
   */
  async deleteParseResult(id: number): Promise<void> {
    try {
      // 先检查记录是否存在
      const result = await this.getParseResultById(id);
      if (!result) {
        throw new NotFoundError('解析结果不存在');
      }

      await query('DELETE FROM parse_results WHERE id = ?', [id]);
      
      logger.info(`解析结果删除成功: ID=${id}`);
    } catch (error) {
      logger.error('删除解析结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取题库的解析统计信息
   */
  async getBankParseStats(bankId: number): Promise<any> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as parse_count,
          SUM(total_questions) as total_questions,
          MAX(created_at) as last_parse_time
        FROM parse_results 
        WHERE bank_id = ?
      `;
      
      const results = await query(sql, [bankId]);
      return results[0];
    } catch (error) {
      logger.error('获取题库解析统计失败:', error);
      throw error;
    }
  }
}

export const parseResultService = new ParseResultService();
