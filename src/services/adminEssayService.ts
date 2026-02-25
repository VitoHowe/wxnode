import fs from 'fs';
import path from 'path';
import { getPool, query } from '@/config/database';
import { ConflictError, NotFoundError, ValidationError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { getEssayStorageDir } from '@/utils/essayStorage';

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

export interface EssayPermissionUser {
  id: number;
  nickname?: string | null;
  username?: string | null;
  phone?: string | null;
  status: number;
  role_name?: string | null;
}

export interface SubjectEssayPermission {
  subject_id: number;
  user_ids: number[];
  users: EssayPermissionUser[];
  updated_at?: string | null;
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

interface ListEssayPermissionUsersParams {
  page: number;
  limit: number;
  keyword?: string;
  includeDisabled?: boolean;
}

class AdminEssayService {
  private getEssayDir(essayId: number): string {
    return getEssayStorageDir(essayId);
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

  async listEssayPermissionUsers(params: ListEssayPermissionUsersParams): Promise<{
    list: EssayPermissionUser[];
    total: number;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(200, Math.max(1, Number(params.limit || 20)));
    const offset = (page - 1) * limit;

    const whereConditions: string[] = [];
    const values: any[] = [];

    if (!params.includeDisabled) {
      whereConditions.push('u.status = 1');
    }

    if (params.keyword) {
      whereConditions.push('(u.nickname LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)');
      values.push(`%${params.keyword}%`, `%${params.keyword}%`, `%${params.keyword}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const countRows = await query(`SELECT COUNT(*) AS total FROM users u ${whereClause}`, values);
    const total = Number(countRows[0]?.total || 0);

    const rows = await query(
      `
        SELECT
          u.id,
          u.nickname,
          u.username,
          u.phone,
          u.status,
          r.name AS role_name
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        ${whereClause}
        ORDER BY u.updated_at DESC, u.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      values
    );

    return {
      list: (rows as any[]).map((row) => ({
        id: Number(row.id),
        nickname: row.nickname,
        username: row.username,
        phone: row.phone,
        status: Number(row.status),
        role_name: row.role_name,
      })),
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSubjectEssayPermission(subjectId: number): Promise<SubjectEssayPermission> {
    await this.ensureSubjectExists(subjectId);

    const rows = await query(
      `
        SELECT
          p.user_id,
          p.updated_at,
          u.nickname,
          u.username,
          u.phone,
          u.status,
          r.name AS role_name
        FROM essay_subject_permissions p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE p.subject_id = ?
        ORDER BY p.updated_at DESC, p.id DESC
      `,
      [subjectId]
    );

    const userIds = (rows as any[]).map((row) => Number(row.user_id));
    const users = (rows as any[]).map((row) => ({
      id: Number(row.user_id),
      nickname: row.nickname,
      username: row.username,
      phone: row.phone,
      status: Number(row.status),
      role_name: row.role_name,
    }));

    return {
      subject_id: subjectId,
      user_ids: Array.from(new Set(userIds)),
      users,
      updated_at: rows.length > 0 ? rows[0].updated_at : null,
    };
  }

  async saveSubjectEssayPermission(
    subjectId: number,
    userIds: number[],
    updatedBy: number
  ): Promise<SubjectEssayPermission> {
    await this.ensureSubjectExists(subjectId);

    const normalizedUserIds = Array.from(
      new Set((userIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))
    );

    if (normalizedUserIds.length > 0) {
      const userPlaceholders = normalizedUserIds.map(() => '?').join(',');
      const existedUsers = await query(
        `SELECT id FROM users WHERE id IN (${userPlaceholders})`,
        normalizedUserIds
      );

      const existedUserIds = new Set((existedUsers as any[]).map((row) => Number(row.id)));
      const missingUsers = normalizedUserIds.filter((id) => !existedUserIds.has(id));
      if (missingUsers.length > 0) {
        throw new ValidationError(`以下用户不存在：${missingUsers.join(', ')}`);
      }
    }

    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(`DELETE FROM essay_subject_permissions WHERE subject_id = ?`, [subjectId]);

      if (normalizedUserIds.length > 0) {
        const insertPlaceholders = normalizedUserIds.map(() => '(?, ?, ?, NOW(), NOW())').join(', ');
        const insertValues: number[] = [];
        normalizedUserIds.forEach((userId) => {
          insertValues.push(subjectId, userId, updatedBy);
        });
        await connection.execute(
          `
            INSERT INTO essay_subject_permissions (subject_id, user_id, created_by, created_at, updated_at)
            VALUES ${insertPlaceholders}
          `,
          insertValues
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      logger.error('保存论文权限失败:', error);
      throw error;
    } finally {
      connection.release();
    }

    return this.getSubjectEssayPermission(subjectId);
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
    const rows = await query(`SELECT id, name FROM essay_orgs WHERE id = ? LIMIT 1`, [orgId]);
    if (rows.length === 0) {
      throw new NotFoundError('机构不存在');
    }

    const essayRows = await query(`SELECT id, file_path FROM essays WHERE org_id = ?`, [orgId]);
    const cleanupDirs = new Set<string>();
    for (const row of essayRows as any[]) {
      const essayId = Number(row.id);
      if (Number.isFinite(essayId) && essayId > 0) {
        // 兼容历史路径：旧版本论文默认存储在 public/question-banks/essays/{id}
        cleanupDirs.add(path.join(process.cwd(), 'public', 'question-banks', 'essays', String(essayId)));
      }
      if (row.file_path) {
        const filePath = String(row.file_path);
        cleanupDirs.add(path.dirname(filePath));
      }
    }

    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`DELETE FROM essays WHERE org_id = ?`, [orgId]);
      await connection.execute(`DELETE FROM essay_orgs WHERE id = ?`, [orgId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      const sqlError = error as any;
      logger.error(
        `删除机构失败: orgId=${orgId}, code=${sqlError?.code || 'UNKNOWN'}, message=${sqlError?.message || String(error)}`
      );
      throw error;
    } finally {
      connection.release();
    }

    for (const dirPath of cleanupDirs) {
      if (!dirPath || !fs.existsSync(dirPath)) {
        continue;
      }
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
      } catch (error) {
        logger.warn(`删除论文目录失败: ${dirPath}`, error);
      }
    }
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
