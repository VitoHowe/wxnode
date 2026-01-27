import { query } from '@/config/database';
import { NotFoundError, ValidationError } from '@/middleware/errorHandler';

export interface RealExamPaper {
  id: number;
  subject_id: number;
  name: string;
  description?: string | null;
  total_questions: number;
  status: number;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface RealExamQuestion {
  id: number;
  paper_id: number;
  question_no: number;
  type: string;
  content: string;
  options?: any;
  answer: string;
  explanation?: string | null;
  difficulty: number;
  tags?: any;
  created_at: string;
  updated_at: string;
}

interface ListPapersParams {
  subjectId: number;
  page: number;
  limit: number;
}

class RealExamService {
  async listPapers(params: ListPapersParams): Promise<{ papers: RealExamPaper[]; total: number; pagination: any }> {
    const { subjectId, page, limit } = params;
    const offset = (page - 1) * limit;

    const countSql = `SELECT COUNT(*) as total FROM real_exam_papers WHERE subject_id = ? AND status = 1`;
    const countResult = await query(countSql, [subjectId]);
    const total = countResult[0].total;

    const sql = `
      SELECT *
      FROM real_exam_papers
      WHERE subject_id = ? AND status = 1
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const papers = await query(sql, [subjectId]);
    return {
      papers: papers as RealExamPaper[],
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaperById(paperId: number): Promise<RealExamPaper | null> {
    const rows = await query(`SELECT * FROM real_exam_papers WHERE id = ? LIMIT 1`, [paperId]);
    return rows.length > 0 ? (rows[0] as RealExamPaper) : null;
  }

  async getPaperQuestions(
    paperId: number,
    page: number = 1,
    limit: number = 0,
    questionNumber?: number
  ): Promise<{ questions?: RealExamQuestion[]; question?: RealExamQuestion; total: number; pagination?: any; currentNumber?: number; hasNext?: boolean; hasPrev?: boolean }> {
    const countSql = `SELECT COUNT(*) as total FROM real_exam_questions WHERE paper_id = ?`;
    const countResult = await query(countSql, [paperId]);
    const total = countResult[0].total;

    if (questionNumber !== undefined) {
      const qNum = parseInt(String(questionNumber));
      if (qNum < 1 || qNum > total) {
        return { total, currentNumber: qNum };
      }

      const sql = `
        SELECT *
        FROM real_exam_questions
        WHERE paper_id = ?
        ORDER BY question_no ASC, id ASC
        LIMIT 1 OFFSET ${qNum - 1}
      `;
      const questions = await query(sql, [paperId]);
      return {
        question: questions[0] || null,
        total,
        currentNumber: qNum,
        hasNext: qNum < total,
        hasPrev: qNum > 1,
      };
    }

    let sql: string;
    if (limit === 0) {
      sql = `
        SELECT *
        FROM real_exam_questions
        WHERE paper_id = ?
        ORDER BY question_no ASC, id ASC
      `;
    } else {
      const offset = (page - 1) * limit;
      const limitNum = Math.min(Math.max(parseInt(String(limit)), 1), 100);
      const offsetNum = Math.max(parseInt(String(offset)), 0);
      sql = `
        SELECT *
        FROM real_exam_questions
        WHERE paper_id = ?
        ORDER BY question_no ASC, id ASC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;
    }

    const questions = await query(sql, [paperId]);
    return {
      questions,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: limit === 0 ? 1 : Math.ceil(total / limit),
      },
    };
  }

  async submitAttempt(params: {
    userId: number;
    paperId: number;
    total_questions: number;
    correct_count: number;
    wrong_count: number;
    accuracy?: number;
    wrong_questions?: Array<{
      question_id: number;
      selected_answer?: string | null;
      correct_answer?: string | null;
    }>;
  }): Promise<{ attemptId: number }> {
    const paper = await this.getPaperById(params.paperId);
    if (!paper) {
      throw new NotFoundError('试卷不存在');
    }

    if (params.total_questions < 0) {
      throw new ValidationError('total_questions 不能为负数');
    }

    const accuracy =
      params.accuracy !== undefined
        ? params.accuracy
        : params.total_questions > 0
          ? Number(((params.correct_count / params.total_questions) * 100).toFixed(2))
          : 0;

    const result = await query(
      `INSERT INTO real_exam_attempts
       (user_id, paper_id, total_questions, correct_count, wrong_count, accuracy, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        params.userId,
        params.paperId,
        params.total_questions,
        params.correct_count,
        params.wrong_count,
        accuracy,
      ]
    );

    const attemptId = result.insertId;

    if (params.wrong_questions && params.wrong_questions.length > 0) {
      const insertSql = `
        INSERT INTO real_exam_wrong_questions
        (attempt_id, user_id, paper_id, question_id, selected_answer, correct_answer, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

      for (const wrong of params.wrong_questions) {
        await query(insertSql, [
          attemptId,
          params.userId,
          params.paperId,
          wrong.question_id,
          wrong.selected_answer || null,
          wrong.correct_answer || null,
        ]);
      }
    }

    return { attemptId };
  }

  async getWrongQuestions(userId: number, paperId: number) {
    const sql = `
      SELECT
        rw.question_id,
        rw.selected_answer,
        rw.correct_answer,
        rw.created_at,
        rq.question_no,
        rq.type,
        rq.content,
        rq.options,
        rq.answer,
        rq.explanation
      FROM real_exam_wrong_questions rw
      INNER JOIN real_exam_questions rq ON rw.question_id = rq.id
      WHERE rw.user_id = ? AND rw.paper_id = ?
      ORDER BY rw.created_at DESC
    `;
    const rows = await query(sql, [userId, paperId]);
    return rows;
  }
}

export const realExamService = new RealExamService();
