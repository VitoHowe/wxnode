import { normalizeWordEntries, wordBookService } from '@/services/wordBookService';
import { query } from '@/config/database';

jest.mock('@/config/database', () => {
  const mockConnection = {
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
    execute: jest.fn().mockResolvedValue([{ insertId: 1 }]),
  };

  return {
    query: jest.fn(),
    getPool: jest.fn().mockReturnValue({
      getConnection: jest.fn().mockResolvedValue(mockConnection),
    }),
  };
});

const mockQuery = query as jest.MockedFunction<typeof query>;

beforeEach(() => {
  mockQuery.mockReset();
});

describe('normalizeWordEntries', () => {
  it('should normalize and deduplicate word entries', () => {
    const result = normalizeWordEntries([
      { english: 'Information', chinese: '信息', tags: ['IT', 'Exam'], example: 'information era' },
      { word: 'information', translation: '资讯' },
      { english: 'Cloud', meaning: '云', part_of_speech: 'n.' },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].word).toBe('Information');
    expect(result[0].tags).toBe('IT; Exam');
    expect(result[1].partOfSpeech).toBe('n.');
  });

  it('should throw when payload is empty', () => {
    expect(() => normalizeWordEntries({})).toThrow('JSON 文件中没有可用的单词数据');
  });
});

describe('wordBookService.listWordBooks', () => {
  it('should apply filters and pagination', async () => {
    mockQuery.mockResolvedValueOnce([{ total: 1 }]);
    mockQuery.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Test',
        description: 'desc',
        language: 'en',
        total_words: 20,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      },
    ]);

    const result = await wordBookService.listWordBooks({
      keyword: 'info',
      language: 'en',
      page: 2,
      limit: 5,
    });

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM word_books'),
      ['%info%', '%info%', 'en']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('ORDER BY'),
      ['%info%', '%info%', 'en']
    );

    expect(result.pagination).not.toBeNull();
    expect(result.pagination?.page).toBe(2);
    expect(result.books).toHaveLength(1);
  });

  it('should return all books when pagination params omitted', async () => {
    mockQuery.mockResolvedValueOnce([{ total: 2 }]);
    mockQuery.mockResolvedValueOnce([
      { id: 1, name: 'Book A', description: null, language: 'zh-CN', total_words: 100, created_at: '', updated_at: '' },
      { id: 2, name: 'Book B', description: null, language: 'en', total_words: 80, created_at: '', updated_at: '' },
    ]);

    const result = await wordBookService.listWordBooks({});

    expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM word_books'), []);
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('ORDER BY'), []);
    expect(result.pagination).toBeNull();
    expect(result.total).toBe(2);
    expect(result.books).toHaveLength(2);
  });

  it('should fetch all word entries by default', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          id: 1,
          name: 'Book',
          description: null,
          language: 'zh-CN',
          total_words: 2,
          source_filename: null,
          stored_path: null,
          source_size: null,
          created_by: null,
          created_at: '',
          updated_at: '',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 10,
          book_id: 1,
          word: 'AI',
          translation: '人工智能',
          phonetic: null,
          definition: null,
          example_sentence: null,
          part_of_speech: null,
          tags: null,
          extra: '{"level":"C1"}',
          order_index: 1,
          created_at: '',
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await wordBookService.getWordEntries({ bookId: 1 });

    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM word_book_entries'), [1]);
    expect(result.pagination).toBeNull();
    expect(result.words).toHaveLength(1);
  });
});

describe('wordBookService word book extras', () => {
  it('should list favorite words after validating book existence', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 1, name: 'Book', total_words: 20 }])
      .mockResolvedValueOnce([
        {
          id: 2,
          entry_id: 10,
          word: 'AI',
          translation: '浜哄伐鏅鸿兘',
          created_at: '2024-01-01',
        },
      ]);

    const favorites = await wordBookService.listFavoriteWords(1);

    expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM word_books'), [1]);
    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('word_book_favorites'), [1]);
    expect(favorites[0].word).toBe('AI');
  });

  it('should add wrong words and return updated list', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 3, book_id: 1, word: 'AI', translation: '浜哄伐鏅鸿兘' }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ id: 1, name: 'Book', total_words: 20 }])
      .mockResolvedValueOnce([
        { id: 1, entry_id: 3, wrong_times: 2, last_wrong_at: '2024-01-02', word: 'AI', translation: '浜哄伐鏅鸿兘' },
      ]);

    const result = await wordBookService.addWrongWord({ bookId: 1, entryId: 3 });

    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO word_book_wrong_entries'),
      [1, 3]
    );
    expect(result[0].wrong_times).toBe(2);
  });

  it('should return word book progress along with current entry', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 1, name: 'Book', total_words: 10 }])
      .mockResolvedValueOnce([
        {
          book_id: 1,
          total_words: 10,
          completed_count: 4,
          current_index: 4,
          current_entry_id: 8,
          progress_percentage: 40,
          notes: null,
          updated_at: '2024-01-03',
        },
      ])
      .mockResolvedValueOnce([{ id: 8, book_id: 1, word: 'AI', translation: '浜哄伐鏅鸿兘', extra: null }]);

    const result = await wordBookService.getWordBookProgress(1);

    expect(result.book.id).toBe(1);
    expect(result.progress?.current_entry?.word).toBe('AI');
  });

  it('should upsert progress and clamp percentage', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 2, name: 'Book', total_words: 8 }])
      .mockResolvedValueOnce([{ id: 5, book_id: 2, word: 'AI', translation: '浜哄伐鏅鸿兘', extra: null }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ id: 2, name: 'Book', total_words: 8 }])
      .mockResolvedValueOnce([
        {
          book_id: 2,
          total_words: 8,
          completed_count: 5,
          current_index: 5,
          current_entry_id: 5,
          progress_percentage: 62.5,
          notes: 'keep going',
          updated_at: '2024-01-04',
        },
      ])
      .mockResolvedValueOnce([{ id: 5, book_id: 2, word: 'AI', translation: '浜哄伐鏅鸿兘', extra: null }]);

    const result = await wordBookService.upsertWordBookProgress({
      bookId: 2,
      completedCount: 5,
      currentIndex: 5,
      currentEntryId: 5,
      notes: 'keep going',
    });

    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO word_book_progress'),
      expect.any(Array)
    );
    expect(result.progress?.progress_percentage).toBeGreaterThan(0);
  });

  it('should reset progress', async () => {
    mockQuery
      .mockResolvedValueOnce([{ id: 1, name: 'Book', total_words: 10 }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ id: 1, name: 'Book', total_words: 10 }])
      .mockResolvedValueOnce([]);

    const result = await wordBookService.resetWordBookProgress(1);

    expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('DELETE FROM word_book_progress'), [1]);
    expect(result.progress).toBeNull();
  });
});
