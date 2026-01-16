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

export interface ModifyWordEntryParams {
  bookId: number;
  entryId: number;
}

export interface UpdateWordBookProgressParams {
  bookId: number;
  completedCount?: number;
  currentIndex?: number;
  currentEntryId?: number | null;
  totalWords?: number;
  notes?: string | null;
}

export interface WordBookProgressRecord {
  book_id: number;
  total_words: number;
  completed_count: number;
  current_index: number;
  current_entry_id?: number | null;
  progress_percentage: number;
  notes?: string | null;
  updated_at: string;
  current_entry?: WordBookEntry | null;
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
      SELECT id, name, description, language, total_words,
             source_filename, stored_path, source_size,
             created_at, updated_at
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
    const book = await this.ensureWordBookExists(params.bookId);

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
   * 获取单词书收藏列表
   */
  async listFavoriteWords(bookId: number) {
    await this.ensureWordBookExists(bookId);
    const sql = `
      SELECT f.id, f.entry_id, f.created_at,
             e.word, e.translation, e.phonetic, e.definition,
             e.example_sentence, e.part_of_speech, e.tags
      FROM word_book_favorites f
      INNER JOIN word_book_entries e ON e.id = f.entry_id
      WHERE f.book_id = ?
      ORDER BY f.created_at DESC
    `;
    return query(sql, [bookId]);
  }

  /**
   * 收藏单词
   */
  async addFavoriteWord(params: ModifyWordEntryParams) {
    await this.ensureWordEntry(params.bookId, params.entryId);
    await query(
      `
        INSERT IGNORE INTO word_book_favorites (book_id, entry_id, created_at)
        VALUES (?, ?, NOW())
      `,
      [params.bookId, params.entryId]
    );
    return this.listFavoriteWords(params.bookId);
  }

  /**
   * 移除收藏单词
   */
  async removeFavoriteWord(params: ModifyWordEntryParams) {
    await this.ensureWordEntry(params.bookId, params.entryId);
    await query('DELETE FROM word_book_favorites WHERE book_id = ? AND entry_id = ?', [
      params.bookId,
      params.entryId,
    ]);
    return this.listFavoriteWords(params.bookId);
  }

  /**
   * 获取错题列表
   */
  async listWrongWords(bookId: number) {
    await this.ensureWordBookExists(bookId);
    const sql = `
      SELECT w.id, w.entry_id, w.wrong_times, w.last_wrong_at,
             e.word, e.translation, e.phonetic, e.definition,
             e.example_sentence, e.part_of_speech, e.tags
      FROM word_book_wrong_entries w
      INNER JOIN word_book_entries e ON e.id = w.entry_id
      WHERE w.book_id = ?
      ORDER BY w.last_wrong_at DESC
    `;
    return query(sql, [bookId]);
  }

  /**
   * 记录错题
   */
  async addWrongWord(params: ModifyWordEntryParams) {
    await this.ensureWordEntry(params.bookId, params.entryId);
    await query(
      `
        INSERT INTO word_book_wrong_entries (book_id, entry_id, wrong_times, last_wrong_at)
        VALUES (?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE wrong_times = wrong_times + 1, last_wrong_at = NOW()
      `,
      [params.bookId, params.entryId]
    );
    return this.listWrongWords(params.bookId);
  }

  /**
   * 移除错题
   */
  async removeWrongWord(params: ModifyWordEntryParams) {
    await this.ensureWordEntry(params.bookId, params.entryId);
    await query('DELETE FROM word_book_wrong_entries WHERE book_id = ? AND entry_id = ?', [
      params.bookId,
      params.entryId,
    ]);
    return this.listWrongWords(params.bookId);
  }

  /**
   * 查询单词书学习进度
   */
  async getWordBookProgress(bookId: number) {
    const book = await this.ensureWordBookExists(bookId);
    const progressSql = `
      SELECT book_id, total_words, completed_count, current_index,
             current_entry_id, progress_percentage, notes, updated_at
      FROM word_book_progress
      WHERE book_id = ?
      LIMIT 1
    `;
    const rows = (await query(progressSql, [bookId])) as WordBookProgressRecord[];
    const progress = rows[0];

    if (!progress) {
      return { book, progress: null };
    }

    let currentEntry: WordBookEntry | null = null;
    if (progress.current_entry_id) {
      currentEntry = await this.findWordEntry(bookId, progress.current_entry_id);
    }

    return {
      book,
      progress: {
        ...progress,
        current_entry: currentEntry,
      },
    };
  }

  /**
   * 保存单词书学习进度
   */
  async upsertWordBookProgress(params: UpdateWordBookProgressParams) {
    const book = await this.ensureWordBookExists(params.bookId);
    const totalWords = Math.max(0, params.totalWords ?? book.total_words ?? 0);
    const completedCount = Math.min(Math.max(params.completedCount ?? 0, 0), totalWords);
    const currentIndex = Math.min(Math.max(params.currentIndex ?? 0, 0), totalWords);
    let currentEntryId: number | null = params.currentEntryId ?? null;

    if (currentEntryId) {
      await this.ensureWordEntry(params.bookId, currentEntryId);
    }

    const progressPercentage =
      totalWords > 0
        ? Math.min(100, Number(((completedCount / totalWords) * 100).toFixed(2)))
        : 0;

    await query(
      `
        INSERT INTO word_book_progress (
          book_id, total_words, completed_count, current_index, current_entry_id,
          progress_percentage, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          total_words = VALUES(total_words),
          completed_count = VALUES(completed_count),
          current_index = VALUES(current_index),
          current_entry_id = VALUES(current_entry_id),
          progress_percentage = VALUES(progress_percentage),
          notes = VALUES(notes),
          updated_at = NOW()
      `,
      [
        params.bookId,
        totalWords,
        completedCount,
        currentIndex,
        currentEntryId,
        progressPercentage,
        params.notes ?? null,
      ]
    );

    return this.getWordBookProgress(params.bookId);
  }

  /**
   * 重置单词书进度
   */
  async resetWordBookProgress(bookId: number) {
    await this.ensureWordBookExists(bookId);
    await query('DELETE FROM word_book_progress WHERE book_id = ?', [bookId]);
    return this.getWordBookProgress(bookId);
  }

  /**
   * 鏍规嵁 ID 鑾峰彇鍗曡瘝涔?
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

  private async ensureWordBookExists(bookId: number): Promise<WordBook> {
    const book = await this.getWordBookById(bookId);
    if (!book) {
      throw new Error('单词书不存在');
    }
    return book;
  }

  private async findWordEntry(bookId: number, entryId: number): Promise<WordBookEntry | null> {
    const sql = `
      SELECT id, book_id, word, translation, phonetic, definition,
             example_sentence, part_of_speech, tags, extra, order_index, created_at
      FROM word_book_entries
      WHERE id = ? AND book_id = ?
      LIMIT 1
    `;
    const rows = await query(sql, [entryId, bookId]);
    if (!rows[0]) {
      return null;
    }
    return {
      ...rows[0],
      extra: safeParseJSON(rows[0].extra),
    };
  }

  private async ensureWordEntry(bookId: number, entryId: number): Promise<WordBookEntry> {
    const entry = await this.findWordEntry(bookId, entryId);
    if (!entry) {
      throw new Error('单词条目不存在');
    }
    return entry;
  }

}

export const wordBookService = new WordBookService();
