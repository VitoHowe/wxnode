import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { getPool, query } from '@/config/database';
import { logger } from '@/utils/logger';

// 单词书实体
export interface WordBook {
  id: number;
  name: string;
  description?: string | null;
  language?: string | null;
  total_words: number;
  source_filename?: string | null;
  stored_path?: string | null;
  source_size?: number | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

// 单词条目实体
export interface WordBookEntry {
  id: number;
  book_id: number;
  word: string;
  translation: string;
  phonetic?: string | null;
  definition?: string | null;
  example_sentence?: string | null;
  part_of_speech?: string | null;
  tags?: string | null;
  extra?: any;
  order_index: number;
  created_at: string;
}

// 上传参数
export interface UploadWordBookParams {
  file: Express.Multer.File;
  userId: number;
  name?: string;
  description?: string;
  language?: string;
}

// 列表查询参数
export interface ListWordBookParams {
  page?: number;
  limit?: number;
  keyword?: string;
  language?: string;
}

// 单词查询参数
export interface GetBookEntriesParams {
  bookId: number;
}

export interface NormalizedWordEntry {
  word: string;
  translation: string;
  phonetic?: string | null;
  definition?: string | null;
  exampleSentence?: string | null;
  partOfSpeech?: string | null;
  tags?: string | null;
  raw?: any;
}

const WORD_KEYS = ['word', 'english', 'term', 'title', 'phrase'];
const TRANSLATION_KEYS = ['translation', 'chinese', 'meaning', 'interpretation', 'definition', 'desc'];
const PHONETIC_KEYS = ['phonetic', 'pronunciation', 'ipa'];
const EXAMPLE_KEYS = ['example', 'example_sentence', 'sentence'];
const POS_KEYS = ['part_of_speech', 'pos', 'speech'];
const TAG_KEYS = ['tags', 'tag', 'category'];

const pickValue = (item: any, keys: string[]): string | undefined => {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && String(item[key]).trim().length > 0) {
      const value = item[key];
      if (Array.isArray(value)) {
        return value.filter((v) => v !== undefined && v !== null).map((v) => String(v).trim()).join('; ');
      }
      return String(value).trim();
    }
  }
  return undefined;
};

/**
 * 将任意结构的 JSON 单词条目转为标准结构
 */
export const normalizeWordEntries = (payload: any): NormalizedWordEntry[] => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.words)
    ? payload.words
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  if (!Array.isArray(source) || source.length === 0) {
    throw new Error('JSON 文件中没有可用的单词数据');
  }

  const dedupedMap = new Map<string, NormalizedWordEntry>();
  source.forEach((item: any) => {
    const word = pickValue(item, WORD_KEYS);
    const translation = pickValue(item, TRANSLATION_KEYS);

    if (!word || !translation) {
      return;
    }

    const normalizedWord = word.trim();
    if (!normalizedWord) {
      return;
    }

    if (!dedupedMap.has(normalizedWord.toLowerCase())) {
      dedupedMap.set(normalizedWord.toLowerCase(), {
        word: normalizedWord,
        translation: translation,
        phonetic: pickValue(item, PHONETIC_KEYS),
        definition: item.definition ? String(item.definition).trim() : undefined,
        exampleSentence: pickValue(item, EXAMPLE_KEYS),
        partOfSpeech: pickValue(item, POS_KEYS),
        tags: pickValue(item, TAG_KEYS),
        raw: item,
      });
    }
  });

  if (dedupedMap.size === 0) {
    throw new Error('未找到包含 word/english 和 translation/chinese 字段的条目');
  }

  return Array.from(dedupedMap.values());
};

/**
 * JSON 列安全解析
 */
const safeParseJSON = (value: any) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

class WordBookService {
  /**
   * 上传并解析单词书
   */
  async uploadWordBook(params: UploadWordBookParams): Promise<WordBook> {
    const { file, userId } = params;
    if (!file) {
      throw new Error('请提供 JSON 格式的单词书文件');
    }

    let parsedContent: any;
    try {
      const raw = fs.readFileSync(file.path, 'utf-8');
      parsedContent = JSON.parse(raw);
    } catch (error: any) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      logger.error('单词书 JSON 解析失败', { message: error?.message });
      throw new Error('JSON 文件格式不正确');
    }

    const normalizedEntries = normalizeWordEntries(parsedContent);
    const totalWords = normalizedEntries.length;
    const bookName =
      params.name?.trim() ||
      (typeof parsedContent?.name === 'string' ? parsedContent.name.trim() : '') ||
      path.basename(file.originalname, path.extname(file.originalname));

    if (!bookName) {
      throw new Error('请提供单词书名称');
    }

    const description =
      params.description?.trim() ||
      (typeof parsedContent?.description === 'string' ? parsedContent.description.trim() : null);
    const language =
      params.language?.trim() ||
      (typeof parsedContent?.language === 'string' ? parsedContent.language.trim() : 'zh-CN');

    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();

      const [insertResult] = await connection.execute<mysql.ResultSetHeader>(
        `
          INSERT INTO word_books (
            name, description, language, total_words,
            source_filename, stored_path, source_size, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          bookName,
          description,
          language,
          totalWords,
          file.originalname,
          file.path,
          file.size,
          userId,
        ]
      );

      const bookId = insertResult.insertId;
      await this.bulkInsertEntries(connection, bookId, normalizedEntries);

      await connection.commit();
      logger.info('单词书上传成功', { bookId, name: bookName, totalWords });

      const book = await this.getWordBookById(bookId);
      if (!book) {
        throw new Error('单词书创建成功但查询失败');
      }
      return book;
    } catch (error: any) {
      await connection.rollback();
      logger.error('单词书入库失败', { message: error?.message });
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('单词书名称重复，请更换名称或语言后重试');
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 批量写入单词条目，采用分片减少单次 SQL 体积
   */
  private async bulkInsertEntries(
    connection: mysql.PoolConnection,
    bookId: number,
    entries: NormalizedWordEntry[]
  ) {
    const chunkSize = 200;
    let orderIndex = 1;

    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const placeholders = chunk
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .join(', ');
      const values: any[] = [];

      chunk.forEach((entry) => {
        values.push(
          bookId,
          entry.word,
          entry.translation,
          entry.phonetic || null,
          entry.definition || null,
          entry.exampleSentence || null,
          entry.partOfSpeech || null,
          entry.tags || null,
          entry.raw ? JSON.stringify(entry.raw) : null,
          orderIndex++
        );
      });

      await connection.execute(
        `
          INSERT INTO word_book_entries (
            book_id, word, translation, phonetic, definition,
            example_sentence, part_of_speech, tags, extra, order_index
          ) VALUES ${placeholders}
        `,
        values
      );
    }
  }

  /**
   * 获取单词书列表
   */
  async listWordBooks(params: ListWordBookParams) {
    const shouldPaginate = params.limit !== undefined || params.page !== undefined;
    const page = shouldPaginate ? Math.max(1, params.page || 1) : 1;
    const limit = shouldPaginate ? Math.min(Math.max(params.limit || 10, 1), 100) : 0;
    const offset = shouldPaginate ? (page - 1) * limit : 0;

    const where: string[] = [];
    const values: any[] = [];

    if (params.keyword) {
      where.push('(name LIKE ? OR description LIKE ?)');
      values.push(`%${params.keyword}%`, `%${params.keyword}%`);
    }

    if (params.language) {
      where.push('language = ?');
      values.push(params.language);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM word_books ${whereClause}`;
    const totalResult = await query(countSql, [...values]);
    const total = totalResult[0]?.total || 0;

    const listSql = `
      SELECT id, name, description, language, total_words, created_at, updated_at
      FROM word_books
      ${whereClause}
      ORDER BY created_at DESC
      ${shouldPaginate ? `LIMIT ${limit} OFFSET ${offset}` : ''}
    `;

    const books = await query(listSql, [...values]);

    return {
      books,
      total,
      pagination: shouldPaginate
        ? {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        : null,
    };
  }

  /**
   * 获取指定单词书的单词列表
   */
  async getWordEntries(params: GetBookEntriesParams) {
    const book = await this.getWordBookById(params.bookId);
    if (!book) {
      throw new Error('单词书不存在');
    }

    const entriesSql = `
      SELECT id, book_id, word, translation, phonetic, definition,
             example_sentence, part_of_speech, tags, extra, order_index, created_at
      FROM word_book_entries
      WHERE book_id = ?
      ORDER BY order_index ASC
    `;

    const entries = await query(entriesSql, [params.bookId]);
    const parsedEntries = entries.map((entry: any) => ({
      ...entry,
      extra: safeParseJSON(entry.extra),
    }));

    const total = parsedEntries.length;

    return {
      book,
      words: parsedEntries,
      total,
      pagination: null,
    };
  }

  /**
   * 根据 ID 获取单词书
   */
  async getWordBookById(id: number): Promise<WordBook | null> {
    const sql = `
      SELECT id, name, description, language, total_words,
             source_filename, stored_path, source_size, created_by,
             created_at, updated_at
      FROM word_books
      WHERE id = ?
      LIMIT 1
    `;
    const result = await query(sql, [id]);
    return result[0] || null;
  }
}

export const wordBookService = new WordBookService();
