import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError } from '@/middleware/errorHandler';

// 解析结果接口
interface ParseResult {
  id: number;
  bank_id: number;
  questions: any[]; // JSON 格式的题目数组
  total_questions: number;
  created_at: string;
  updated_at: string;
  bank_name?: string;
  file_name?: string;
}

// 查询参数
interface GetParseResultsParams {
  bank_id?: number;
  page: number;
  limit: number;
}

class ParseResultService {
  /**
   * 获取解析结果列表
   */
  async getParseResults(params: GetParseResultsParams): Promise<{ 
    results: ParseResult[]; 
    total: number; 
    pagination: any 
  }> {
    const { bank_id, page, limit } = params;
    const offset = (page - 1) * limit;

    try {
      // 构建查询条件
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (bank_id) {
        whereConditions.push('pr.bank_id = ?');
        queryParams.push(bank_id);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // 获取总数
      const countSql = `SELECT COUNT(*) as total FROM parse_results pr ${whereClause}`;
      const countResult = await query(countSql, queryParams);
      const total = countResult[0].total;

      // 获取解析结果列表
      const sql = `
        SELECT 
          pr.*,
          qb.name as bank_name,
          qb.file_original_name as file_name
        FROM parse_results pr 
        LEFT JOIN question_banks qb ON pr.bank_id = qb.id 
        ${whereClause}
        ORDER BY pr.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const results = await query(sql, [...queryParams, limit, offset]);

      // 解析 JSON 格式的 questions
      const formattedResults = results.map((result: any) => ({
        ...result,
        questions: typeof result.questions === 'string' 
          ? JSON.parse(result.questions) 
          : result.questions,
      }));

      return {
        results: formattedResults,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
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
        LIMIT 1
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
  async getParseResultsByBankId(bankId: number): Promise<ParseResult[]> {
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
      logger.error('根据题库ID获取解析结果失败:', error);
      throw error;
    }
  }

  /**
   * 删除解析结果
   */
  async deleteParseResult(id: number): Promise<void> {
    try {
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
