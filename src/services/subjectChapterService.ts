import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { ConflictError, NotFoundError, ValidationError } from '@/middleware/errorHandler';

export interface SubjectChapter {
  id: number;
  subject_id: number;
  chapter_name: string;
  display_name?: string | null;
  chapter_order: number;
  status: number;
  question_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SubjectChapterAlias {
  id: number;
  subject_id: number;
  subject_chapter_id: number;
  alias_name: string;
  chapter_name: string;
  display_name?: string | null;
  chapter_order: number;
  created_at: string;
  updated_at: string;
}

interface CreateSubjectChapterParams {
  chapter_name: string;
  display_name?: string | null;
  chapter_order?: number;
  status?: number;
}

interface UpdateSubjectChapterParams {
  chapter_name?: string;
  display_name?: string | null;
  chapter_order?: number;
  status?: number;
}

interface CreateSubjectChapterAliasParams {
  alias_name: string;
  subject_chapter_id: number;
}

class SubjectChapterService {
  async listSubjectChapters(
    subjectId: number,
    params?: { includeDisabled?: boolean }
  ): Promise<SubjectChapter[]> {
    const includeDisabled = !!params?.includeDisabled;
    const statusClause = includeDisabled ? '' : 'AND sc.status = 1';

    const sql = `
      SELECT 
        sc.*,
        COALESCE(SUM(qc.question_count), 0) as question_count
      FROM subject_chapters sc
      LEFT JOIN question_chapters qc ON qc.subject_chapter_id = sc.id
      WHERE sc.subject_id = ?
      ${statusClause}
      GROUP BY sc.id
      ORDER BY sc.chapter_order ASC, sc.id ASC
    `;

    const rows = await query(sql, [subjectId]);
    return rows as SubjectChapter[];
  }

  async getSubjectChapterById(id: number): Promise<SubjectChapter | null> {
    const sql = `SELECT * FROM subject_chapters WHERE id = ? LIMIT 1`;
    const rows = await query(sql, [id]);
    return rows.length > 0 ? (rows[0] as SubjectChapter) : null;
  }

  async createSubjectChapter(
    subjectId: number,
    params: CreateSubjectChapterParams
  ): Promise<SubjectChapter> {
    try {
      const sql = `
        INSERT INTO subject_chapters (subject_id, chapter_name, display_name, chapter_order, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const result = await query(sql, [
        subjectId,
        params.chapter_name.trim(),
        params.display_name || null,
        params.chapter_order ?? 0,
        params.status ?? 1,
      ]);

      const created = await this.getSubjectChapterById(result.insertId);
      if (!created) {
        throw new Error('创建章节后获取失败');
      }
      return created;
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('章节名称已存在');
      }
      logger.error('创建科目章节失败:', error);
      throw error;
    }
  }

  async updateSubjectChapter(
    subjectId: number,
    chapterId: number,
    params: UpdateSubjectChapterParams
  ): Promise<SubjectChapter> {
    const existing = await this.getSubjectChapterById(chapterId);
    if (!existing || existing.subject_id !== subjectId) {
      throw new NotFoundError('章节不存在');
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (params.chapter_name !== undefined) {
      updateFields.push('chapter_name = ?');
      values.push(params.chapter_name.trim());
    }
    if (params.display_name !== undefined) {
      updateFields.push('display_name = ?');
      values.push(params.display_name || null);
    }
    if (params.chapter_order !== undefined) {
      updateFields.push('chapter_order = ?');
      values.push(params.chapter_order);
    }
    if (params.status !== undefined) {
      updateFields.push('status = ?');
      values.push(params.status);
    }

    if (updateFields.length === 0) {
      return existing;
    }

    values.push(chapterId);

    try {
      await query(
        `UPDATE subject_chapters SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('章节名称已存在');
      }
      logger.error('更新科目章节失败:', error);
      throw error;
    }

    const updated = await this.getSubjectChapterById(chapterId);
    if (!updated) {
      throw new NotFoundError('章节不存在');
    }
    return updated;
  }

  async listSubjectChapterAliases(subjectId: number): Promise<SubjectChapterAlias[]> {
    const rows = await query(
      `
        SELECT 
          sca.id,
          sca.subject_id,
          sca.subject_chapter_id,
          sca.alias_name,
          sc.chapter_name,
          sc.display_name,
          sc.chapter_order,
          sca.created_at,
          sca.updated_at
        FROM subject_chapter_aliases sca
        INNER JOIN subject_chapters sc ON sc.id = sca.subject_chapter_id
        WHERE sca.subject_id = ?
        ORDER BY sc.chapter_order ASC, sc.chapter_name ASC, sca.alias_name ASC
      `,
      [subjectId]
    );
    return rows as SubjectChapterAlias[];
  }

  private async getSubjectChapterAliasById(aliasId: number): Promise<SubjectChapterAlias | null> {
    const rows = await query(
      `
        SELECT 
          sca.id,
          sca.subject_id,
          sca.subject_chapter_id,
          sca.alias_name,
          sc.chapter_name,
          sc.display_name,
          sc.chapter_order,
          sca.created_at,
          sca.updated_at
        FROM subject_chapter_aliases sca
        INNER JOIN subject_chapters sc ON sc.id = sca.subject_chapter_id
        WHERE sca.id = ?
        LIMIT 1
      `,
      [aliasId]
    );
    return rows.length > 0 ? (rows[0] as SubjectChapterAlias) : null;
  }

  async createSubjectChapterAlias(
    subjectId: number,
    params: CreateSubjectChapterAliasParams
  ): Promise<SubjectChapterAlias> {
    const aliasName = params.alias_name.trim();
    if (!aliasName) {
      throw new ValidationError('章节别名不能为空');
    }

    const chapter = await this.getSubjectChapterById(params.subject_chapter_id);
    if (!chapter || chapter.subject_id !== subjectId) {
      throw new NotFoundError('目标章节不存在');
    }

    try {
      const result = await query(
        `
          INSERT INTO subject_chapter_aliases (subject_id, subject_chapter_id, alias_name, created_at, updated_at)
          VALUES (?, ?, ?, NOW(), NOW())
        `,
        [subjectId, params.subject_chapter_id, aliasName]
      );

      const created = await this.getSubjectChapterAliasById(result.insertId);
      if (!created) {
        throw new Error('创建章节别名后获取失败');
      }
      return created;
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('章节别名已存在');
      }
      logger.error('创建章节别名失败:', error);
      throw error;
    }
  }

  async deleteSubjectChapterAlias(subjectId: number, aliasId: number): Promise<void> {
    const existing = await query(
      `SELECT id FROM subject_chapter_aliases WHERE id = ? AND subject_id = ? LIMIT 1`,
      [aliasId, subjectId]
    );

    if (existing.length === 0) {
      throw new NotFoundError('章节别名不存在');
    }

    await query(`DELETE FROM subject_chapter_aliases WHERE id = ?`, [aliasId]);
  }

  async syncSubjectChaptersFromBanks(subjectId: number): Promise<{
    totalBanks: number;
    totalChapters: number;
    createdChapters: number;
    boundChapters: number;
    skippedChapters: number;
  }> {
    const banks = await query(`SELECT id FROM question_banks WHERE subject_id = ?`, [subjectId]);
    const totalBanks = banks.length;

    const chapterRows = await query(
      `
        SELECT qc.id, qc.chapter_name, qc.chapter_order, qc.subject_chapter_id
        FROM question_chapters qc
        INNER JOIN question_banks qb ON qb.id = qc.bank_id
        WHERE qb.subject_id = ?
      `,
      [subjectId]
    );

    const totalChapters = chapterRows.length;
    if (totalChapters === 0) {
      return {
        totalBanks,
        totalChapters,
        createdChapters: 0,
        boundChapters: 0,
        skippedChapters: 0,
      };
    }

    const normalizeName = (value: any) => (value ? String(value).trim() : '');
    const aliasRows = await query(
      `SELECT alias_name, subject_chapter_id FROM subject_chapter_aliases WHERE subject_id = ?`,
      [subjectId]
    );
    const aliasMap = new Map<string, number>();
    for (const row of aliasRows as Array<{ alias_name: string; subject_chapter_id: number }>) {
      const normalized = normalizeName(row.alias_name);
      if (!normalized) continue;
      aliasMap.set(normalized, row.subject_chapter_id);
    }

    const existing = await query(`SELECT id, chapter_name FROM subject_chapters WHERE subject_id = ?`, [subjectId]);
    const chapterMap = new Map<string, number>();

    for (const row of existing as Array<{ id: number; chapter_name: string }>) {
      const normalized = normalizeName(row.chapter_name);
      if (!normalized) continue;
      chapterMap.set(normalized, row.id);
    }

    const orderMap = new Map<string, number>();
    for (const row of chapterRows as Array<{ chapter_name: string; chapter_order: number }>) {
      const normalized = normalizeName(row.chapter_name);
      if (!normalized) continue;
      if (aliasMap.has(normalized)) continue;
      const orderValue = Number.isFinite(row.chapter_order) ? Number(row.chapter_order) : 0;
      const existingOrder = orderMap.get(normalized);
      if (existingOrder === undefined || orderValue < existingOrder) {
        orderMap.set(normalized, orderValue);
      }
    }

    let createdChapters = 0;
    for (const [name, order] of orderMap.entries()) {
      if (chapterMap.has(name)) continue;
      try {
        const insertResult = await query(
          `INSERT INTO subject_chapters (subject_id, chapter_name, display_name, chapter_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
          [subjectId, name, name, order]
        );
        chapterMap.set(name, insertResult.insertId);
        createdChapters += 1;
      } catch (error: any) {
        if (error?.code === 'ER_DUP_ENTRY') {
          const retry = await query(
            `SELECT id FROM subject_chapters WHERE subject_id = ? AND chapter_name = ? LIMIT 1`,
            [subjectId, name]
          );
          if (retry.length > 0) {
            chapterMap.set(name, retry[0].id);
            continue;
          }
        }
        logger.error('同步科目章节失败:', error);
        throw error;
      }
    }

    let aliasBound = 0;
    if (aliasMap.size > 0) {
      const aliasUpdate = await query(
        `
          UPDATE question_chapters qc
          INNER JOIN question_banks qb ON qb.id = qc.bank_id
          INNER JOIN subject_chapter_aliases sca
            ON sca.subject_id = qb.subject_id AND sca.alias_name = qc.chapter_name
          SET qc.subject_chapter_id = sca.subject_chapter_id, qc.updated_at = NOW()
          WHERE qb.subject_id = ?
        `,
        [subjectId]
      );
      aliasBound = Number(aliasUpdate?.affectedRows || 0);
    }

    const updateResult = await query(
      `
        UPDATE question_chapters qc
        INNER JOIN question_banks qb ON qb.id = qc.bank_id
        INNER JOIN subject_chapters sc
          ON sc.subject_id = qb.subject_id AND sc.chapter_name = qc.chapter_name
        SET qc.subject_chapter_id = sc.id, qc.updated_at = NOW()
        WHERE qb.subject_id = ? AND (qc.subject_chapter_id IS NULL OR qc.subject_chapter_id = 0)
      `,
      [subjectId]
    );

    const boundChapters = aliasBound + Number(updateResult?.affectedRows || 0);
    return {
      totalBanks,
      totalChapters,
      createdChapters,
      boundChapters,
      skippedChapters: Math.max(totalChapters - boundChapters, 0),
    };
  }

  async getSubjectChapterCountsByBank(
    bankId: number
  ): Promise<Array<SubjectChapter & { question_count: number }>> {
    const bankRows = await query(
      `SELECT subject_id FROM question_banks WHERE id = ? LIMIT 1`,
      [bankId]
    );

    if (bankRows.length === 0) {
      throw new NotFoundError('题库不存在');
    }

    const subjectId = bankRows[0].subject_id;
    if (!subjectId) {
      throw new ValidationError('题库未绑定科目');
    }

    const sql = `
      SELECT 
        sc.*,
        COALESCE(qc.question_count, 0) as question_count
      FROM subject_chapters sc
      LEFT JOIN question_chapters qc
        ON qc.subject_chapter_id = sc.id AND qc.bank_id = ?
      WHERE sc.subject_id = ?
      ORDER BY sc.chapter_order ASC, sc.id ASC
    `;

    const rows = await query(sql, [bankId, subjectId]);
    return rows as Array<SubjectChapter & { question_count: number }>;
  }
}

export const subjectChapterService = new SubjectChapterService();
