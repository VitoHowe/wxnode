import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { ConflictError, NotFoundError } from '@/middleware/errorHandler';

export interface Subject {
  id: number;
  name: string;
  code?: string | null;
  status: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CreateSubjectParams {
  name: string;
  code?: string | null;
  status?: number;
  sort_order?: number;
}

interface UpdateSubjectParams {
  name?: string;
  code?: string | null;
  status?: number;
  sort_order?: number;
}

class SubjectService {
  async listSubjects(params?: { includeDisabled?: boolean }): Promise<Subject[]> {
    const includeDisabled = !!params?.includeDisabled;
    const whereClause = includeDisabled ? '' : 'WHERE status = 1';

    const sql = `
      SELECT *
      FROM subjects
      ${whereClause}
      ORDER BY sort_order ASC, id ASC
    `;

    const subjects = await query(sql);
    return subjects as Subject[];
  }

  async getSubjectById(id: number): Promise<Subject | null> {
    const sql = `SELECT * FROM subjects WHERE id = ? LIMIT 1`;
    const rows = await query(sql, [id]);
    return rows.length > 0 ? (rows[0] as Subject) : null;
  }

  async createSubject(params: CreateSubjectParams): Promise<Subject> {
    try {
      const sql = `
        INSERT INTO subjects (name, code, status, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `;

      const result = await query(sql, [
        params.name.trim(),
        params.code || null,
        params.status ?? 1,
        params.sort_order ?? 0,
      ]);

      const created = await this.getSubjectById(result.insertId);
      if (!created) {
        throw new Error('创建科目后获取失败');
      }
      return created;
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('科目名称或编码已存在');
      }
      logger.error('创建科目失败:', error);
      throw error;
    }
  }

  async updateSubject(id: number, params: UpdateSubjectParams): Promise<Subject> {
    const existing = await this.getSubjectById(id);
    if (!existing) {
      throw new NotFoundError('科目不存在');
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (params.name !== undefined) {
      updateFields.push('name = ?');
      values.push(params.name.trim());
    }
    if (params.code !== undefined) {
      updateFields.push('code = ?');
      values.push(params.code || null);
    }
    if (params.status !== undefined) {
      updateFields.push('status = ?');
      values.push(params.status);
    }
    if (params.sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      values.push(params.sort_order);
    }

    if (updateFields.length === 0) {
      return existing;
    }

    values.push(id);

    try {
      await query(
        `UPDATE subjects SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('科目名称或编码已存在');
      }
      logger.error('更新科目失败:', error);
      throw error;
    }

    const updated = await this.getSubjectById(id);
    if (!updated) {
      throw new NotFoundError('科目不存在');
    }
    return updated;
  }
}

export const subjectService = new SubjectService();
