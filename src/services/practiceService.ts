import { query } from '@/config/database';

export type PracticeMode = 'real' | 'mock' | 'special' | 'random';
export type PracticeSourceType = 'paper' | 'bank' | 'chapter' | 'subject_chapter' | 'subject';
export type PracticeQuestionSource = 'real_exam' | 'question_bank';

export interface PracticeWrongQuestionInput {
  question_id: number;
  selected_answer?: string | null;
  correct_answer?: string | null;
}

export interface PracticeAttemptInput {
  userId: number;
  subjectId: number;
  mode: PracticeMode;
  sourceType: PracticeSourceType;
  sourceId: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy?: number;
  questionSource: PracticeQuestionSource;
  questionIds?: number[];
  wrongQuestions?: PracticeWrongQuestionInput[];
}

const DEFAULT_CORRECT_STREAK_LIMIT = 3;

class PracticeService {
  private calculateAccuracy(total: number, correct: number, accuracy?: number): number {
    if (accuracy !== undefined && Number.isFinite(accuracy)) {
      return Number(accuracy);
    }
    if (!Number.isFinite(total) || total <= 0) {
      return 0;
    }
    const value = (correct / total) * 100;
    return Number(value.toFixed(2));
  }

  private buildStats(total: number, correct: number, wrong: number) {
    const safeTotal = Number.isFinite(total) ? total : 0;
    const safeCorrect = Number.isFinite(correct) ? correct : 0;
    const safeWrong = Number.isFinite(wrong) ? wrong : 0;
    return {
      answered_count: safeTotal,
      correct_count: safeCorrect,
      wrong_count: safeWrong,
      accuracy: this.calculateAccuracy(safeTotal, safeCorrect),
    };
  }

  async createPracticeAttempt(input: PracticeAttemptInput): Promise<{ attemptId: number }> {
    const accuracy = this.calculateAccuracy(input.totalQuestions, input.correctCount, input.accuracy);
    const result = await query(
      `INSERT INTO practice_attempts
       (user_id, subject_id, mode, source_type, source_id, total_questions, correct_count, wrong_count, accuracy, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        input.userId,
        input.subjectId,
        input.mode,
        input.sourceType,
        input.sourceId,
        input.totalQuestions,
        input.correctCount,
        input.wrongCount,
        accuracy,
      ]
    );

    await this.updateWrongSet({
      userId: input.userId,
      subjectId: input.subjectId,
      mode: input.mode,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      questionSource: input.questionSource,
      questionIds: input.questionIds,
      wrongQuestions: input.wrongQuestions || [],
    });

    return { attemptId: result.insertId };
  }

  async updateWrongSet(params: {
    userId: number;
    subjectId: number;
    mode: PracticeMode;
    sourceType: PracticeSourceType;
    sourceId: number;
    questionSource: PracticeQuestionSource;
    questionIds?: number[];
    wrongQuestions: PracticeWrongQuestionInput[];
    correctStreakLimit?: number;
  }): Promise<void> {
    const wrongQuestions = params.wrongQuestions || [];
    const wrongIdSet = new Set<number>();
    wrongQuestions.forEach((item) => {
      if (Number.isFinite(item.question_id)) {
        wrongIdSet.add(Number(item.question_id));
      }
    });

    for (const wrong of wrongQuestions) {
      if (!Number.isFinite(wrong.question_id)) continue;
      await query(
        `INSERT INTO practice_wrong_questions
         (user_id, subject_id, mode, source_type, source_id, question_source, question_id, selected_answer, correct_answer,
          wrong_times, correct_streak, last_wrong_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           mode = VALUES(mode),
           source_type = VALUES(source_type),
           source_id = VALUES(source_id),
           selected_answer = VALUES(selected_answer),
           correct_answer = VALUES(correct_answer),
           wrong_times = wrong_times + 1,
           correct_streak = 0,
           last_wrong_at = NOW(),
           updated_at = NOW()`,
        [
          params.userId,
          params.subjectId,
          params.mode,
          params.sourceType,
          params.sourceId,
          params.questionSource,
          Number(wrong.question_id),
          wrong.selected_answer ?? null,
          wrong.correct_answer ?? null,
        ]
      );
    }

    const questionIds = (params.questionIds || [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    if (questionIds.length === 0) {
      return;
    }

    const correctIds = questionIds.filter((id) => !wrongIdSet.has(id));
    if (correctIds.length === 0) {
      return;
    }

    const placeholders = correctIds.map(() => '?').join(',');
    await query(
      `UPDATE practice_wrong_questions
       SET correct_streak = correct_streak + 1,
           last_correct_at = NOW(),
           updated_at = NOW()
       WHERE user_id = ? AND subject_id = ? AND question_source = ? AND question_id IN (${placeholders})`,
      [params.userId, params.subjectId, params.questionSource, ...correctIds]
    );

    const streakLimit = params.correctStreakLimit ?? DEFAULT_CORRECT_STREAK_LIMIT;
    await query(
      `DELETE FROM practice_wrong_questions
       WHERE user_id = ? AND subject_id = ? AND question_source = ? AND question_id IN (${placeholders})
         AND correct_streak >= ?`,
      [params.userId, params.subjectId, params.questionSource, ...correctIds, streakLimit]
    );
  }

  async getSummary(userId: number, subjectId: number, mode?: PracticeMode) {
    const stats = await this.getStats(userId, subjectId, mode);
    const modeCounts = await this.getModeCounts(subjectId);
    const wrongSetCount = await this.getWrongSetCount(userId, subjectId, mode);
    return {
      stats,
      mode_counts: modeCounts,
      wrong_set_count: wrongSetCount,
    };
  }

  async getWrongSetCount(userId: number, subjectId: number, mode?: PracticeMode): Promise<number> {
    const conditions = ['user_id = ?', 'subject_id = ?'];
    const params: any[] = [userId, subjectId];
    if (mode) {
      conditions.push('mode = ?');
      params.push(mode);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(`SELECT COUNT(*) as total FROM practice_wrong_questions ${whereClause}`, params);
    return Number(rows[0]?.total || 0);
  }

  async listWrongQuestions(params: {
    userId: number;
    subjectId: number;
    mode?: PracticeMode;
    page: number;
    limit: number;
  }) {
    const page = Math.max(params.page, 1);
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const offset = (page - 1) * limit;

    const conditions = ['pwq.user_id = ?', 'pwq.subject_id = ?'];
    const queryParams: any[] = [params.userId, params.subjectId];
    if (params.mode) {
      conditions.push('pwq.mode = ?');
      queryParams.push(params.mode);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRows = await query(
      `SELECT COUNT(*) as total FROM practice_wrong_questions pwq ${whereClause}`,
      queryParams
    );
    const total = Number(countRows[0]?.total || 0);

    const sql = `
      SELECT
        pwq.id,
        pwq.user_id,
        pwq.subject_id,
        pwq.mode,
        pwq.source_type,
        pwq.source_id,
        pwq.question_source,
        pwq.question_id,
        pwq.selected_answer,
        pwq.correct_answer,
        pwq.wrong_times,
        pwq.correct_streak,
        pwq.last_wrong_at,
        pwq.last_correct_at,
        pwq.created_at,
        pwq.updated_at,
        CASE
          WHEN pwq.source_type = 'paper' THEN rep.name
          WHEN pwq.source_type = 'bank' THEN qb.name
          WHEN pwq.source_type = 'chapter' THEN CONCAT(qb_chapter.name, ' / ', qc.chapter_name)
          WHEN pwq.source_type = 'subject_chapter' THEN COALESCE(sc.display_name, sc.chapter_name)
          WHEN pwq.source_type = 'subject' THEN s.name
          ELSE NULL
        END as source_name,
        COALESCE(req.question_no, q.question_no) as question_no,
        COALESCE(req.type, q.type) as question_type,
        COALESCE(req.content, q.content) as content,
        COALESCE(req.options, q.options) as options,
        COALESCE(req.answer, q.answer) as answer,
        COALESCE(req.explanation, q.explanation) as explanation
      FROM practice_wrong_questions pwq
      LEFT JOIN real_exam_questions req
        ON pwq.question_source = 'real_exam' AND pwq.question_id = req.id
      LEFT JOIN questions q
        ON pwq.question_source = 'question_bank' AND pwq.question_id = q.id
      LEFT JOIN real_exam_papers rep
        ON pwq.source_type = 'paper' AND pwq.source_id = rep.id
      LEFT JOIN question_banks qb
        ON pwq.source_type = 'bank' AND pwq.source_id = qb.id
      LEFT JOIN question_chapters qc
        ON pwq.source_type = 'chapter' AND pwq.source_id = qc.id
      LEFT JOIN question_banks qb_chapter
        ON qc.bank_id = qb_chapter.id
      LEFT JOIN subject_chapters sc
        ON pwq.source_type = 'subject_chapter' AND pwq.source_id = sc.id
      LEFT JOIN subjects s
        ON pwq.source_type = 'subject' AND pwq.source_id = s.id
      ${whereClause}
      ORDER BY pwq.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const items = await query(sql, queryParams);
    return {
      items,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteWrongQuestion(userId: number, wrongId: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM practice_wrong_questions WHERE id = ? AND user_id = ?`,
      [wrongId, userId]
    );
    return Number(result?.affectedRows || 0) > 0;
  }

  private async getStats(userId: number, subjectId: number, mode?: PracticeMode) {
    if (mode === 'real') {
      const real = await this.getRealStats(userId, subjectId);
      return this.buildStats(real.total, real.correct, real.wrong);
    }
    if (mode) {
      const practice = await this.getPracticeStats(userId, subjectId, mode);
      return this.buildStats(practice.total, practice.correct, practice.wrong);
    }

    const real = await this.getRealStats(userId, subjectId);
    const practice = await this.getPracticeStats(userId, subjectId);
    return this.buildStats(
      real.total + practice.total,
      real.correct + practice.correct,
      real.wrong + practice.wrong
    );
  }

  private async getRealStats(userId: number, subjectId: number): Promise<{ total: number; correct: number; wrong: number }> {
    const rows = await query(
      `SELECT
         COALESCE(SUM(rea.total_questions), 0) as total,
         COALESCE(SUM(rea.correct_count), 0) as correct,
         COALESCE(SUM(rea.wrong_count), 0) as wrong
       FROM real_exam_attempts rea
       INNER JOIN real_exam_papers rep ON rep.id = rea.paper_id
       WHERE rea.user_id = ? AND rep.subject_id = ?`,
      [userId, subjectId]
    );
    return {
      total: Number(rows[0]?.total || 0),
      correct: Number(rows[0]?.correct || 0),
      wrong: Number(rows[0]?.wrong || 0),
    };
  }

  private async getPracticeStats(
    userId: number,
    subjectId: number,
    mode?: PracticeMode
  ): Promise<{ total: number; correct: number; wrong: number }> {
    const conditions = ['user_id = ?', 'subject_id = ?'];
    const params: any[] = [userId, subjectId];
    if (mode) {
      conditions.push('mode = ?');
      params.push(mode);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const rows = await query(
      `SELECT
         COALESCE(SUM(total_questions), 0) as total,
         COALESCE(SUM(correct_count), 0) as correct,
         COALESCE(SUM(wrong_count), 0) as wrong
       FROM practice_attempts ${whereClause}`,
      params
    );
    return {
      total: Number(rows[0]?.total || 0),
      correct: Number(rows[0]?.correct || 0),
      wrong: Number(rows[0]?.wrong || 0),
    };
  }

  private async getModeCounts(subjectId: number) {
    const realRows = await query(
      `SELECT COALESCE(SUM(total_questions), 0) as total
       FROM real_exam_papers WHERE subject_id = ? AND status = 1`,
      [subjectId]
    );
    const mockRows = await query(
      `SELECT COALESCE(SUM(total_questions), 0) as total
       FROM question_banks WHERE subject_id = ? AND parse_status = 'completed'`,
      [subjectId]
    );
    const specialRows = await query(
      `SELECT COALESCE(SUM(qc.question_count), 0) as total
       FROM question_chapters qc
       INNER JOIN question_banks qb ON qb.id = qc.bank_id
       WHERE qb.subject_id = ?`,
      [subjectId]
    );
    const real = Number(realRows[0]?.total || 0);
    const mock = Number(mockRows[0]?.total || 0);
    const special = Number(specialRows[0]?.total || 0);
    return {
      real,
      mock,
      special,
      random: mock,
    };
  }
}

export const practiceService = new PracticeService();
