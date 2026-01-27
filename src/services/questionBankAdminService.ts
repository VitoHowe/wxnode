import { query } from '@/config/database';
import { subjectChapterService } from '@/services/subjectChapterService';

export interface AdminQuestionBank {
  id: number;
  name: string;
  description?: string | null;
  subject_id?: number | null;
  subject_name?: string | null;
  total_questions: number;
  parse_status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  chapter_count: number;
}

interface ListQuestionBanksParams {
  page: number;
  limit: number;
  subjectId?: number;
}

class QuestionBankAdminService {
  async listQuestionBanks(
    params: ListQuestionBanksParams
  ): Promise<{ list: AdminQuestionBank[]; total: number; pagination: any }> {
    const pageNum = Number(params.page) || 1;
    const limitNum = Number(params.limit) || 20;
    const offsetNum = (pageNum - 1) * limitNum;

    const whereConditions: string[] = [`qb.file_type = 'question_bank'`];
    const queryParams: any[] = [];

    if (params.subjectId) {
      whereConditions.push('qb.subject_id = ?');
      queryParams.push(params.subjectId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM question_banks qb ${whereClause}`;
    const countResult = await query(countSql, queryParams);
    const total = countResult[0].total;

    const sql = `
      SELECT
        qb.*,
        s.name as subject_name,
        (SELECT COUNT(*) FROM question_chapters qc WHERE qc.bank_id = qb.id) as chapter_count
      FROM question_banks qb
      LEFT JOIN subjects s ON qb.subject_id = s.id
      ${whereClause}
      ORDER BY qb.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    const rows = await query(sql, queryParams);

    return {
      list: rows as AdminQuestionBank[],
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getBankSubjectChapters(bankId: number) {
    return subjectChapterService.getSubjectChapterCountsByBank(bankId);
  }
}

export const questionBankAdminService = new QuestionBankAdminService();
