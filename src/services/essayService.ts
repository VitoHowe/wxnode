import { query } from '@/config/database';
import { NotFoundError, ValidationError } from '@/middleware/errorHandler';

export interface EssayOrgOption {
  id: number;
  name: string;
  description?: string | null;
  sort_order: number;
  essay_count: number;
}

export interface EssayListItem {
  id: number;
  title: string;
  org_id: number;
  org_name: string;
  subject_id: number;
  subject_chapter_id: number;
  subject_chapter_name?: string;
  content_url: string;
  updated_at: string;
}

export interface EssayDetail {
  id: number;
  title: string;
  org_id: number;
  org_name?: string;
  subject_id: number;
  subject_name?: string;
  subject_chapter_id: number;
  subject_chapter_name?: string;
  file_size?: number | null;
  status: number;
  content_url: string;
  created_at: string;
  updated_at: string;
}

class EssayService {
  private buildContentUrl(essayId: number): string {
    return `/api/essays/${essayId}/source.md`;
  }

  async listSubjectEssayOrgs(subjectId: number): Promise<EssayOrgOption[]> {
    const subjectRows = await query(`SELECT id FROM subjects WHERE id = ? LIMIT 1`, [subjectId]);
    if (subjectRows.length === 0) {
      throw new NotFoundError('科目不存在');
    }

    const rows = await query(
      `
        SELECT
          o.id,
          o.name,
          o.description,
          o.sort_order,
          COUNT(e.id) AS essay_count
        FROM essay_orgs o
        INNER JOIN essays e ON e.org_id = o.id
        WHERE o.status = 1
          AND e.status = 1
          AND e.subject_id = ?
        GROUP BY o.id, o.name, o.description, o.sort_order
        ORDER BY o.sort_order ASC, o.id ASC
      `,
      [subjectId]
    );

    return (rows as any[]).map((row) => ({
      id: Number(row.id),
      name: row.name,
      description: row.description,
      sort_order: Number(row.sort_order || 0),
      essay_count: Number(row.essay_count || 0),
    }));
  }

  async listChapterEssays(subjectId: number, chapterId: number, orgId: number): Promise<EssayListItem[]> {
    const chapterRows = await query(
      `SELECT id, subject_id FROM subject_chapters WHERE id = ? LIMIT 1`,
      [chapterId]
    );
    if (chapterRows.length === 0) {
      throw new NotFoundError('章节不存在');
    }
    if (Number(chapterRows[0].subject_id) !== Number(subjectId)) {
      throw new ValidationError('章节不属于指定科目');
    }

    const rows = await query(
      `
        SELECT
          e.id,
          e.title,
          e.org_id,
          o.name AS org_name,
          e.subject_id,
          e.subject_chapter_id,
          sc.chapter_name AS subject_chapter_name,
          e.updated_at
        FROM essays e
        INNER JOIN essay_orgs o ON o.id = e.org_id
        INNER JOIN subject_chapters sc ON sc.id = e.subject_chapter_id
        WHERE e.status = 1
          AND o.status = 1
          AND e.subject_id = ?
          AND e.subject_chapter_id = ?
          AND e.org_id = ?
        ORDER BY e.updated_at DESC, e.id DESC
      `,
      [subjectId, chapterId, orgId]
    );

    return (rows as any[]).map((row) => ({
      id: Number(row.id),
      title: row.title,
      org_id: Number(row.org_id),
      org_name: row.org_name,
      subject_id: Number(row.subject_id),
      subject_chapter_id: Number(row.subject_chapter_id),
      subject_chapter_name: row.subject_chapter_name,
      content_url: this.buildContentUrl(Number(row.id)),
      updated_at: row.updated_at,
    }));
  }

  async listSubjectEssays(subjectId: number, orgId: number): Promise<EssayListItem[]> {
    const subjectRows = await query(`SELECT id FROM subjects WHERE id = ? LIMIT 1`, [subjectId]);
    if (subjectRows.length === 0) {
      throw new NotFoundError('科目不存在');
    }

    const rows = await query(
      `
        SELECT
          e.id,
          e.title,
          e.org_id,
          o.name AS org_name,
          e.subject_id,
          e.subject_chapter_id,
          COALESCE(sc.display_name, sc.chapter_name) AS subject_chapter_name,
          e.updated_at
        FROM essays e
        INNER JOIN essay_orgs o ON o.id = e.org_id
        LEFT JOIN subject_chapters sc ON sc.id = e.subject_chapter_id
        WHERE e.status = 1
          AND o.status = 1
          AND e.subject_id = ?
          AND e.org_id = ?
        ORDER BY sc.chapter_order ASC, sc.id ASC, e.updated_at DESC, e.id DESC
      `,
      [subjectId, orgId]
    );

    return (rows as any[]).map((row) => ({
      id: Number(row.id),
      title: row.title,
      org_id: Number(row.org_id),
      org_name: row.org_name,
      subject_id: Number(row.subject_id),
      subject_chapter_id: Number(row.subject_chapter_id),
      subject_chapter_name: row.subject_chapter_name,
      content_url: this.buildContentUrl(Number(row.id)),
      updated_at: row.updated_at,
    }));
  }

  async getEssayDetail(id: number): Promise<EssayDetail> {
    const rows = await query(
      `
        SELECT
          e.*,
          o.name AS org_name,
          s.name AS subject_name,
          sc.chapter_name AS subject_chapter_name
        FROM essays e
        LEFT JOIN essay_orgs o ON o.id = e.org_id
        LEFT JOIN subjects s ON s.id = e.subject_id
        LEFT JOIN subject_chapters sc ON sc.id = e.subject_chapter_id
        WHERE e.id = ? AND e.status = 1
        LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      throw new NotFoundError('论文不存在');
    }

    const essay = rows[0] as any;
    return {
      id: Number(essay.id),
      title: essay.title,
      org_id: Number(essay.org_id),
      org_name: essay.org_name,
      subject_id: Number(essay.subject_id),
      subject_name: essay.subject_name,
      subject_chapter_id: Number(essay.subject_chapter_id),
      subject_chapter_name: essay.subject_chapter_name,
      file_size: essay.file_size,
      status: Number(essay.status),
      content_url: this.buildContentUrl(Number(essay.id)),
      created_at: essay.created_at,
      updated_at: essay.updated_at,
    };
  }
}

export const essayService = new EssayService();
