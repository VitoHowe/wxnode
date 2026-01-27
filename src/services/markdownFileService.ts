import fs from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';
import { query } from '@/config/database';
import { logger } from '@/utils/logger';
import { NotFoundError, ValidationError } from '@/middleware/errorHandler';

type ParseStatus = 'pending' | 'parsing' | 'completed' | 'failed';

export interface MarkdownFileRecord {
  id: number;
  name: string;
  description?: string | null;
  original_filename?: string | null;
  file_path: string;
  file_size?: number | null;
  parse_status: ParseStatus;
  chapter_count: number;
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  file_url?: string;
}

export interface MarkdownChapterRecord {
  id: number;
  file_id: number;
  chapter_title: string;
  chapter_order: number;
  file_path: string;
  file_size?: number | null;
  created_at: string;
  updated_at: string;
  download_url?: string;
}

interface UploadParams {
  file: Express.Multer.File;
  name: string;
  description?: string;
  userId: number;
}

interface ListParams {
  page: number;
  limit: number;
  status?: string;
}

const MARKDOWN_ROOT = path.join(process.cwd(), 'public', 'markdown-docs');
const CHAPTER_PATTERN = /^\u7b2c\s*[0-9\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u5343\u3007\u96f6]+\s*\u7ae0/;

class MarkdownFileService {
  private getFileDir(fileId: number) {
    return path.join(MARKDOWN_ROOT, String(fileId));
  }

  private getSourcePath(fileId: number) {
    return path.join(this.getFileDir(fileId), 'source.md');
  }

  private getChaptersDir(fileId: number) {
    return path.join(this.getFileDir(fileId), 'chapters');
  }

  private buildPublicUrl(fileId: number, relativePath: string) {
    const normalized = relativePath.replace(/\\/g, '/');
    return `/api/markdown-files/${fileId}/${normalized}`;
  }

  async uploadFile(params: UploadParams): Promise<MarkdownFileRecord> {
    const { file, name, description, userId } = params;
    const ext = path.extname(file.originalname).toLowerCase();
    const isMarkdown = ext === '.md' || file.mimetype === 'text/markdown' || file.mimetype === 'text/plain';

    if (!isMarkdown) {
      throw new ValidationError('\u4ec5\u652f\u6301 Markdown \u6587\u4ef6 (.md)');
    }

    const result = await query(
      `INSERT INTO markdown_files (
        name, description, original_filename, file_path, file_size,
        parse_status, chapter_count, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, NOW(), NOW())`,
      [
        name,
        description || null,
        file.originalname,
        file.path,
        file.size,
        userId,
      ]
    );

    const fileId = result.insertId;
    const fileDir = this.getFileDir(fileId);
    const sourcePath = this.getSourcePath(fileId);

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.copyFileSync(file.path, sourcePath);
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await query(
      'UPDATE markdown_files SET file_path = ?, updated_at = NOW() WHERE id = ?',
      [sourcePath, fileId]
    );

    const record = await this.getFileById(fileId);
    if (!record) {
      throw new NotFoundError('\u4e0a\u4f20\u540e\u83b7\u53d6 Markdown \u6587\u4ef6\u5931\u8d25');
    }

    logger.info(`Markdown upload success: ID=${fileId}, Name=${name}`);
    return record;
  }

  async listFiles(params: ListParams): Promise<{ files: MarkdownFileRecord[]; total: number; pagination: any }> {
    const pageNum = Number(params.page) || 1;
    const limitNum = Number(params.limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    const where: string[] = [];
    const values: any[] = [];

    if (params.status) {
      where.push('mf.parse_status = ?');
      values.push(params.status);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(*) as total FROM markdown_files mf ${whereClause}`;
    const countResult = await query(countSql, values);
    const total = countResult[0].total;

    const sql = `
      SELECT mf.*, u.nickname as creator_name
      FROM markdown_files mf
      LEFT JOIN users u ON mf.created_by = u.id
      ${whereClause}
      ORDER BY mf.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    const rows = await query(sql, values);
    const files = (rows as MarkdownFileRecord[]).map((row) => ({
      ...row,
      file_path: row.file_path,
      file_url: this.buildPublicUrl(row.id, 'source.md'),
    }));

    return {
      files,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getFileById(id: number): Promise<MarkdownFileRecord | null> {
    const rows = await query(
      `SELECT mf.*, u.nickname as creator_name
       FROM markdown_files mf
       LEFT JOIN users u ON mf.created_by = u.id
       WHERE mf.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) {
      return null;
    }
    const record = rows[0] as MarkdownFileRecord;
    return {
      ...record,
      file_url: this.buildPublicUrl(record.id, 'source.md'),
    };
  }

  async parseFile(id: number): Promise<{ chapter_count: number }> {
    const record = await this.getFileById(id);
    if (!record) {
      throw new NotFoundError('Markdown \u6587\u4ef6\u4e0d\u5b58\u5728');
    }

    if (!record.file_path || !fs.existsSync(record.file_path)) {
      throw new NotFoundError('Markdown \u539f\u6587\u4e0d\u5b58\u5728');
    }

    if (record.parse_status === 'parsing') {
      return { chapter_count: record.chapter_count || 0 };
    }

    await query('UPDATE markdown_files SET parse_status = ? WHERE id = ?', ['parsing', id]);

    try {
      const content = fs.readFileSync(record.file_path, 'utf-8');
      const chapters = this.splitByChapterHeading(
        content,
        record.name || record.original_filename || '\u672a\u547d\u540d\u7ae0\u8282'
      );

      await this.resetChapters(id);

      const chaptersDir = this.getChaptersDir(id);
      if (!fs.existsSync(chaptersDir)) {
        fs.mkdirSync(chaptersDir, { recursive: true });
      }

      let order = 1;
      for (const chapter of chapters) {
        const filename = `chapter-${String(order).padStart(2, '0')}.md`;
        const chapterPath = path.join(chaptersDir, filename);
        const chapterContent = chapter.content.trim() || chapter.content;

        fs.writeFileSync(chapterPath, chapterContent, 'utf-8');

        await query(
          `INSERT INTO markdown_chapters
           (file_id, chapter_title, chapter_order, file_path, file_size, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            id,
            chapter.title,
            order,
            chapterPath,
            Buffer.byteLength(chapterContent, 'utf-8'),
          ]
        );
        order += 1;
      }

      await query(
        'UPDATE markdown_files SET parse_status = ?, chapter_count = ?, updated_at = NOW() WHERE id = ?',
        ['completed', chapters.length, id]
      );

      return { chapter_count: chapters.length };
    } catch (error) {
      await query('UPDATE markdown_files SET parse_status = ?, updated_at = NOW() WHERE id = ?', ['failed', id]);
      logger.error('Markdown parse failed:', error);
      throw error;
    }
  }

  async listChapters(fileId: number): Promise<MarkdownChapterRecord[]> {
    const record = await this.getFileById(fileId);
    if (!record) {
      throw new NotFoundError('Markdown \u6587\u4ef6\u4e0d\u5b58\u5728');
    }

    const rows = await query(
      `SELECT * FROM markdown_chapters WHERE file_id = ? ORDER BY chapter_order ASC`,
      [fileId]
    );

    return (rows as MarkdownChapterRecord[]).map((row) => {
      const filename = path.basename(row.file_path);
      return {
        ...row,
        download_url: this.buildPublicUrl(fileId, `chapters/${filename}`),
      };
    });
  }

  async deleteFile(id: number): Promise<void> {
    const record = await this.getFileById(id);
    if (!record) {
      throw new NotFoundError('Markdown \u6587\u4ef6\u4e0d\u5b58\u5728');
    }

    await query('DELETE FROM markdown_files WHERE id = ?', [id]);

    const fileDir = this.getFileDir(id);
    if (fs.existsSync(fileDir)) {
      fs.rmSync(fileDir, { recursive: true, force: true });
    }
  }

  private async resetChapters(fileId: number) {
    await query('DELETE FROM markdown_chapters WHERE file_id = ?', [fileId]);
    const chaptersDir = this.getChaptersDir(fileId);
    if (fs.existsSync(chaptersDir)) {
      fs.rmSync(chaptersDir, { recursive: true, force: true });
    }
  }

  private splitByChapterHeading(content: string, fallbackTitle: string) {
    const md = new MarkdownIt();
    const tokens = md.parse(content, {});
    const lines = content.split(/\r?\n/);
    const headings: { title: string; line: number }[] = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token.type === 'heading_open' && token.tag.startsWith('h') && token.map) {
        const inline = tokens[i + 1];
        const title = inline && inline.type === 'inline' ? inline.content.trim() : '';
        headings.push({
          title: title || fallbackTitle,
          line: token.map[0],
        });
      }
    }

    const chapterHeadings = headings.filter((heading) => CHAPTER_PATTERN.test(heading.title));

    if (!chapterHeadings.length) {
      return [{ title: fallbackTitle, content }];
    }

    return chapterHeadings.map((heading, index) => {
      const start = heading.line;
      const end = index + 1 < chapterHeadings.length ? chapterHeadings[index + 1].line : lines.length;
      const chunk = lines.slice(start, end).join('\n');
      return {
        title: heading.title || `${fallbackTitle}-${index + 1}`,
        content: chunk,
      };
    });
  }
}

export const markdownFileService = new MarkdownFileService();
