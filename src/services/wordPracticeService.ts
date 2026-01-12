import { query } from '@/config/database';
import { logger } from '@/utils/logger';

export type WordMasteryStatus = 'pending' | 'review' | 'mastered';

export interface WordPracticeProgressRow {
  word_entry_id: number;
  status: WordMasteryStatus;
  is_favorite: number;
  wrong_count: number;
  last_practice_at: string | null;
}

export interface WordPracticeStateRow {
  last_word_entry_id: number | null;
  last_word_order_index: number | null;
  last_practice_at: string | null;
}

export interface WordEntryView {
  id: number;
  word: string;
  translation: string;
  phonetic?: string | null;
  definition?: string | null;
  example_sentence?: string | null;
  part_of_speech?: string | null;
  order_index: number;
  status: WordMasteryStatus;
  is_favorite: boolean;
  wrong_count: number;
}

export interface WordListQuery {
  page?: number;
  limit?: number;
}

export interface WordPracticeSummary {
  total: number;
  mastered: number;
  review: number;
  favorites: number;
  wrongs: number;
  last_word_entry_id: number | null;
  last_word_order_index: number | null;
}

class WordPracticeService {
  /**
   * 确认单词条目属于指定单词书
   */
  async ensureWordInBook(bookId: number, wordEntryId: number) {
    const result = await query(
      'SELECT id, order_index FROM word_book_entries WHERE id = ? AND book_id = ? LIMIT 1',
      [wordEntryId, bookId]
    );
    if (!result.length) {
      throw new Error('单词不存在或不属于该单词书');
    }
    return result[0];
  }

  /**
   * 获取包含进度的单词列表（支持分页）
   */
  async getWordsWithProgress(
    userId: number,
    bookId: number,
    params?: WordListQuery
  ): Promise<{ list: WordEntryView[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.min(Math.max(Number(params?.limit) || 50, 1), 200);
    const offset = (page - 1) * limit;

    const totalResult = await query(
      'SELECT COUNT(*) AS total FROM word_book_entries WHERE book_id = ?',
      [bookId]
    );
    const total = totalResult[0]?.total || 0;

    // 部分 MySQL 驱动对 LIMIT ?,? 存在类型限制，改用内插保证数值安全
    const words = await query(
      `
        SELECT id, word, translation, phonetic, definition, example_sentence, part_of_speech, order_index
        FROM word_book_entries
        WHERE book_id = ?
        ORDER BY order_index ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      [bookId]
    );

    const progresses = await query(
      `
        SELECT word_entry_id, status, is_favorite, wrong_count, last_practice_at
        FROM user_word_progress
        WHERE user_id = ? AND book_id = ?
      `,
      [userId, bookId]
    );

    const progressMap = new Map<number, WordPracticeProgressRow>();
    progresses.forEach((row: any) => {
      progressMap.set(row.word_entry_id, {
        word_entry_id: row.word_entry_id,
        status: row.status,
        is_favorite: Number(row.is_favorite || 0),
        wrong_count: Number(row.wrong_count || 0),
        last_practice_at: row.last_practice_at,
      });
    });

    const list = words.map((item: any) => {
      const progress = progressMap.get(item.id);
      return {
        id: item.id,
        word: item.word,
        translation: item.translation,
        phonetic: item.phonetic,
        definition: item.definition,
        example_sentence: item.example_sentence,
        part_of_speech: item.part_of_speech,
        order_index: item.order_index,
        status: (progress?.status as WordMasteryStatus) || 'pending',
        is_favorite: progress?.is_favorite === 1,
        wrong_count: progress?.wrong_count || 0,
      };
    });

    return {
      list,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * 获取用户在某单词书的进度摘要
   */
  async getBookProgressSummary(userId: number, bookId: number): Promise<WordPracticeSummary> {
    const totalsResult = await query(
      'SELECT COUNT(*) AS total FROM word_book_entries WHERE book_id = ?',
      [bookId]
    );
    const total = totalsResult[0]?.total || 0;

    const progressRows = await query(
      `
        SELECT status, is_favorite, wrong_count
        FROM user_word_progress
        WHERE user_id = ? AND book_id = ?
      `,
      [userId, bookId]
    );

    let mastered = 0;
    let review = 0;
    let favorites = 0;
    let wrongs = 0;

    progressRows.forEach((row: any) => {
      if (row.status === 'mastered') mastered += 1;
      if (row.status === 'review') review += 1;
      if (row.is_favorite) favorites += 1;
      if (row.wrong_count && Number(row.wrong_count) > 0) wrongs += 1;
    });

    const state = await this.getBookState(userId, bookId);

    return {
      total,
      mastered,
      review,
      favorites,
      wrongs,
      last_word_entry_id: state?.last_word_entry_id ?? null,
      last_word_order_index: state?.last_word_order_index ?? null,
    };
  }

  /**
   * 更新单词进度（收藏/掌握/复习/错题）
   */
  async upsertWordProgress(
    userId: number,
    bookId: number,
    wordEntryId: number,
    payload: {
      status?: WordMasteryStatus;
      is_favorite?: boolean;
      wrong_delta?: number;
    }
  ) {
    await this.ensureWordInBook(bookId, wordEntryId);

    const existing = await query(
      `
        SELECT id, status, is_favorite, wrong_count
        FROM user_word_progress
        WHERE user_id = ? AND word_entry_id = ?
        LIMIT 1
      `,
      [userId, wordEntryId]
    );

    const nextStatus: WordMasteryStatus = payload.status || existing[0]?.status || 'pending';
    const nextFavorite =
      payload.is_favorite !== undefined ? (payload.is_favorite ? 1 : 0) : Number(existing[0]?.is_favorite || 0);
    const wrongDelta = payload.wrong_delta || 0;
    const nextWrongCount = Math.max(
      0,
      Number(existing[0]?.wrong_count || 0) + wrongDelta
    );

    if (existing.length) {
      await query(
        `
          UPDATE user_word_progress
          SET status = ?, is_favorite = ?, wrong_count = ?, last_practice_at = NOW(), updated_at = NOW()
          WHERE user_id = ? AND word_entry_id = ?
        `,
        [nextStatus, nextFavorite, nextWrongCount, userId, wordEntryId]
      );
    } else {
      await query(
        `
          INSERT INTO user_word_progress
            (user_id, book_id, word_entry_id, status, is_favorite, wrong_count, last_practice_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        `,
        [userId, bookId, wordEntryId, nextStatus, nextFavorite, nextWrongCount]
      );
    }

    logger.info('更新单词进度成功', {
      userId,
      bookId,
      wordEntryId,
      status: nextStatus,
      favorite: nextFavorite,
      wrong_count: nextWrongCount,
    });
  }

  /**
   * 保存/更新当前书的学习位置
   */
  async saveBookState(
    userId: number,
    bookId: number,
    state: { last_word_entry_id?: number | null; last_word_order_index?: number | null }
  ) {
    const { last_word_entry_id = null, last_word_order_index = null } = state;
    const existing = await query(
      'SELECT id FROM user_word_book_state WHERE user_id = ? AND book_id = ? LIMIT 1',
      [userId, bookId]
    );

    if (existing.length) {
      await query(
        `
          UPDATE user_word_book_state
          SET last_word_entry_id = ?, last_word_order_index = ?, last_practice_at = NOW(), updated_at = NOW()
          WHERE user_id = ? AND book_id = ?
        `,
        [last_word_entry_id, last_word_order_index, userId, bookId]
      );
    } else {
      await query(
        `
          INSERT INTO user_word_book_state
            (user_id, book_id, last_word_entry_id, last_word_order_index, last_practice_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())
        `,
        [userId, bookId, last_word_entry_id, last_word_order_index]
      );
    }
  }

  /**
   * 获取书籍学习位置
   */
  async getBookState(userId: number, bookId: number): Promise<WordPracticeStateRow | null> {
    const rows = await query(
      `
        SELECT last_word_entry_id, last_word_order_index, last_practice_at
        FROM user_word_book_state
        WHERE user_id = ? AND book_id = ?
        LIMIT 1
      `,
      [userId, bookId]
    );
    return rows[0] || null;
  }
}

export const wordPracticeService = new WordPracticeService();
