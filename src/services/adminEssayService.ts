import fs from 'fs';
import path from 'path';
import { query } from '@/config/database';
import { ConflictError, NotFoundError, ValidationError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

export interface EssayOrgRecord {
  id: number;
  name: string;
  description?: string | null;
  status: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  essay_count?: number;
}

export interface EssayRecord {
  id: number;
  title: string;
  org_id: number;
  org_name?: string;
  subject_id: number;
  subject_name?: string;
  subject_chapter_id: number;
  subject_chapter_name?: string;
  file_path: string;
  file_size?: number | null;
  status: number;
  created_by?: number | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  content_url?: string;
}

interface ListEssayParams {
  page: number;
  limit: number;
  orgId?: number;
  subjectId?: number;
  subjectChapterId?: number;
  status?: number;
  keyword?: string;
}

interface CreateEssayParams {
  title: string;
  orgId: number;
  subjectId: number;
  subjectChapterId: number;
  status?: number;
  createdBy: number;
  file: Express.Multer.File;
}

interface UpdateEssayParams {
  id: number;
  title?: string;
  orgId?: number;
  subjectId?: number;
  subjectChapterId?: number;
  status?: number;
  file?: Express.Multer.File;
}

class AdminEssayService {
  private getEssayDir(essayId: number): string {
    return path.join(process.cwd(), 'public', 'question-banks', 'essays', String(essayId));
  }

  private getEssaySourcePath(essayId: number): string {
    return path.join(this.getEssayDir(essayId), 'source.md');
  }

  private buildEssayContentUrl(essayId: number): string {
    return `/api/essays/${essayId}/source.md`;
  }

  private removeFileIfExists(filePath: string) {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private async ensureOrgExists(orgId: number): Promise<void> {
    const rows = await query(`SELECT id FROM essay_orgs WHERE id = ? LIMIT 1`, [orgId]);
    if (rows.length === 0) {
      throw new NotFoundError('机构不存在');
    }
  }

  private async ensureSubjectExists(subjectId: number): Promise<void> {
    const rows = await query(`SELECT id FROM subjects WHERE id = ? LIMIT 1`, [subjectId]);
    if (rows.length === 0) {
      throw new NotFoundError('科目不存在');
    }
  }

  private async ensureSubjectChapterBelongsToSubject(
    subjectId: number,
    subjectChapterId: number
  ): Promise<void> {
    const rows = await query(
      `SELECT id FROM subject_chapters WHERE id = ? AND subject_id = ? LIMIT 1`,
      [subjectChapterId, subjectId]
    );
    if (rows.length === 0) {
      throw new ValidationError('章节不属于所选科目');
    }
  }

  private async getEssayById(id: number): Promise<EssayRecord | null> {
    const rows = await query(
      `
        SELECT
          e.*,
          o.name AS org_name,
          s.name AS subject_name,
          sc.chapter_name AS subject_chapter_name,
          u.nickname AS creator_name
        FROM essays e
        LEFT JOIN essay_orgs o ON o.id = e.org_id
        LEFT JOIN subjects s ON s.id = e.subject_id
        LEFT JOIN subject_chapters sc ON sc.id = e.subject_chapter_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    const essay = rows[0] as EssayRecord;
    return {
      ...essay,
      content_url: this.buildEssayContentUrl(essay.id),
    };
  }

  async listEssayOrgs(params?: { includeDisabled?: boolean }): Promise<EssayOrgRecord[]> {
    const includeDisabled = !!params?.includeDisabled;
    const whereClause = includeDisabled ? '' : 'WHERE o.status = 1';

    const rows = await query(
      `
        SELECT
          o.*,
          (
            SELECT COUNT(*)
            FROM essays e
            WHERE e.org_id = o.id
          ) AS essay_count
        FROM essay_orgs o
        ${whereClause}
        ORDER BY o.sort_order ASC, o.id ASC
      `
    );

    return rows as EssayOrgRecord[];
  }

  async createEssayOrg(payload: {
    name: string;
    description?: string;
    status?: number;
    sort_order?: number;
  }): Promise<EssayOrgRecord> {
    try {
      const result = await query(
        `
          INSERT INTO essay_orgs (name, description, status, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, NOW(), NOW())
        `,
        [
          payload.name.trim(),
          payload.description || null,
          payload.status ?? 1,
          payload.sort_order ?? 0,
        ]
      );

      const rows = await query(`SELECT * FROM essay_orgs WHERE id = ? LIMIT 1`, [result.insertId]);
      return rows[0] as EssayOrgRecord;
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictError('机构名称已存在');
      }
      logger.error('创建机构失败:', error);
      throw error;
    }
  }

  async updateEssayOrg(
    orgId: number,
    payload: {
      name?: string;
      description?: string | null;
      status?: number;
      sort_order?: number;
    }
  ): Promise<EssayOrgRecord> {
    const rows = await query(`SELECT * FROM essay_orgs WHERE id = ? LIMIT 1`, [orgId]);
    if (rows.length === 0) {
      throw new NotFoundError('机构不存在');
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (payload.name !== undefined) {
      fields.push('name = ?');
      values.push(payload.name.trim());
    }
    if (payload.description !== undefined) {
      fields.push('description = ?');
      values.push(payload.description || null);
    }
    if (payload.status !== undefined) {
      fields.push('status = ?');
      values.push(payload.status);
    }
    if (payload.sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(payload.sort_order);
    }

    if (fields.length > 0) {
      try {
        await query(
          `UPDATE essay_orgs SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          [...values, orgId]
        );
      } catch (error: any) {
        if (error?.code === 'ER_DUP_ENTRY') {
          throw new ConflictError('机构名称已存在');
        }
        logger.error('更新机构失败:', error);
        throw error;
      }
    }

    const latest = await query(`SELECT * FROM essay_orgs WHERE id = ? LIMIT 1`, [orgId]);
    return latest[0] as EssayOrgRecord;
  }

  async deleteEssayOrg(orgId: number): Promise<void> {
    const rows = await query(`SELECT id FROM essay_orgs WHERE id = ? LIMIT 1`, [orgId]);
    if (rows.length === 0) {
      throw new NotFoundError('机构不存在');
    }

    const refRows = await query(`SELECT COUNT(*) AS total FROM essays WHERE org_id = ?`, [orgId]);
    if (Number(refRows[0].total) > 0) {
      throw new ConflictError('该机构下存在论文，无法删除');
    }

    await query(`DELETE FROM essay_orgs WHERE id = ?`, [orgId]);
  }

  async listEssays(params: ListEssayParams): Promise<{ list: EssayRecord[]; total: number; pagination: any }> {
    const pageNum = Number(params.page) || 1;
    const limitNum = Number(params.limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    const whereConditions: string[] = [];
    const values: any[] = [];

    if (params.orgId) {
      whereConditions.push('e.org_id = ?');
      values.push(params.orgId);
    }
    if (params.subjectId) {
      whereConditions.push('e.subject_id = ?');
      values.push(params.subjectId);
    }
    if (params.subjectChapterId) {
      whereConditions.push('e.subject_chapter_id = ?');
      values.push(params.subjectChapterId);
    }
    if (params.status !== undefined) {
      whereConditions.push('e.status = ?');
      values.push(params.status);
    }
    if (params.keyword) {
      whereConditions.push('e.title LIKE ?');
      values.push(`%${params.keyword}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const countRows = await query(`SELECT COUNT(*) AS total FROM essays e ${whereClause}`, values);
    const total = Number(countRows[0].total || 0);

    const rows = await query(
      `
        SELECT
          e.*,
          o.name AS org_name,
          s.name AS subject_name,
          sc.chapter_name AS subject_chapter_name,
          u.nickname AS creator_name
        FROM essays e
        LEFT JOIN essay_orgs o ON o.id = e.org_id
        LEFT JOIN subjects s ON s.id = e.subject_id
        LEFT JOIN subject_chapters sc ON sc.id = e.subject_chapter_id
        LEFT JOIN users u ON u.id = e.created_by
        ${whereClause}
        ORDER BY e.updated_at DESC, e.id DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `,
      values
    );

    const list = (rows as EssayRecord[]).map((essay) => ({
      ...essay,
      content_url: this.buildEssayContentUrl(essay.id),
    }));

    return {
      list,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async createEssay(params: CreateEssayParams): Promise<EssayRecord> {
    const { title, orgId, subjectId, subjectChapterId, status = 1, createdBy, file } = params;
    let essayId = 0;

    await this.ensureOrgExists(orgId);
    await this.ensureSubjectExists(subjectId);
    await this.ensureSubjectChapterBelongsToSubject(subjectId, subjectChapterId);

    try {
      const insertResult = await query(
        `
          INSERT INTO essays (
            title,
            org_id,
            subject_id,
            subject_chapter_id,
            file_path,
            file_size,
            status,
            created_by,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [title.trim(), orgId, subjectId, subjectChapterId, '', file.size || null, status, createdBy]
      );

      essayId = Number(insertResult.insertId);
      const essayDir = this.getEssayDir(essayId);
      const targetPath = this.getEssaySourcePath(essayId);

      fs.mkdirSync(essayDir, { recursive: true });
      fs.copyFileSync(file.path, targetPath);
      this.removeFileIfExists(file.path);

      await query(`UPDATE essays SET file_path = ?, file_size = ?, updated_at = NOW() WHERE id = ?`, [
        targetPath,
        file.size || null,
        essayId,
      ]);

      const essay = await this.getEssayById(essayId);
      if (!essay) {
        throw new NotFoundError('论文创建失败');
      }
      return essay;
    } catch (error) {
      this.removeFileIfExists(file.path);
      if (essayId > 0) {
        await query(`DELETE FROM essays WHERE id = ?`, [essayId]);
        const essayDir = this.getEssayDir(essayId);
        if (fs.existsSync(essayDir)) {
          fs.rmSync(essayDir, { recursive: true, force: true });
        }
      }
      logger.error('创建论文失败:', error);
      throw error;
    }
  }

  async updateEssay(params: UpdateEssayParams): Promise<EssayRecord> {
    const current = await this.getEssayById(params.id);
    if (!current) {
      throw new NotFoundError('论文不存在');
    }

    const nextSubjectId = params.subjectId ?? current.subject_id;
    const nextSubjectChapterId = params.subjectChapterId ?? current.subject_chapter_id;
    const nextOrgId = params.orgId ?? current.org_id;

    await this.ensureOrgExists(nextOrgId);
    await this.ensureSubjectExists(nextSubjectId);
    await this.ensureSubjectChapterBelongsToSubject(nextSubjectId, nextSubjectChapterId);

    const fields: string[] = [];
    const values: any[] = [];

    if (params.title !== undefined) {
      fields.push('title = ?');
      values.push(params.title.trim());
    }
    if (params.orgId !== undefined) {
      fields.push('org_id = ?');
      values.push(params.orgId);
    }
    if (params.subjectId !== undefined) {
      fields.push('subject_id = ?');
      values.push(params.subjectId);
    }
    if (params.subjectChapterId !== undefined) {
      fields.push('subject_chapter_id = ?');
      values.push(params.subjectChapterId);
    }
    if (params.status !== undefined) {
      fields.push('status = ?');
      values.push(params.status);
    }

    if (params.file) {
      const essayDir = this.getEssayDir(params.id);
      const targetPath = this.getEssaySourcePath(params.id);
      fs.mkdirSync(essayDir, { recursive: true });
      fs.copyFileSync(params.file.path, targetPath);
      this.removeFileIfExists(params.file.path);

      fields.push('file_path = ?');
      values.push(targetPath);
      fields.push('file_size = ?');
      values.push(params.file.size || null);
    }

    if (fields.length > 0) {
      await query(`UPDATE essays SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, [
        ...values,
        params.id,
      ]);
    }

    const updated = await this.getEssayById(params.id);
    if (!updated) {
      throw new NotFoundError('论文不存在');
    }
    return updated;
  }

  async deleteEssay(id: number): Promise<void> {
    const current = await this.getEssayById(id);
    if (!current) {
      throw new NotFoundError('论文不存在');
    }

    await query(`DELETE FROM essays WHERE id = ?`, [id]);
    const essayDir = this.getEssayDir(id);
    if (fs.existsSync(essayDir)) {
      fs.rmSync(essayDir, { recursive: true, force: true });
    }
  }
}

export const adminEssayService = new AdminEssayService();
