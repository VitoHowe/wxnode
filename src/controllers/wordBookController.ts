import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { wordBookService } from '@/services/wordBookService';

class WordBookController {
  /**
   * 上传单词书 JSON 文件
   */
  uploadWordBook = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    if (!req.file) {
      return ResponseUtil.validationError(res, '请上传 JSON 格式的单词书文件');
    }

    const { name, description, language } = req.body as {
      name?: string;
      description?: string;
      language?: string;
    };

    const book = await wordBookService.uploadWordBook({
      file: req.file,
      userId: req.user.userId,
      name,
      description,
      language,
    });

    return ResponseUtil.success(res, book, '单词书上传成功');
  });

  /**
   * 获取单词书列表
   */
  listWordBooks = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, keyword, language } = req.query;
    const result = await wordBookService.listWordBooks({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      keyword: keyword as string,
      language: language as string,
    });

    return ResponseUtil.success(res, result, '获取单词书列表成功');
  });

  /**
   * 获取指定单词书的单词列表
   */
  getWordBookWords = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await wordBookService.getWordEntries({
      bookId: Number(id),
    });

    return ResponseUtil.success(res, result, '获取单词书内容成功');
  });
  /**
   * 获取单词书收藏列表
   */
  listFavoriteWords = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const favorites = await wordBookService.listFavoriteWords(Number(id));
    return ResponseUtil.success(res, favorites, '获取收藏列表成功');
  });

  /**
   * 收藏单词
   */
  addFavoriteWord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { entryId } = req.body as { entryId: number };
    const favorites = await wordBookService.addFavoriteWord({
      bookId: Number(id),
      entryId: Number(entryId),
    });
    return ResponseUtil.success(res, favorites, '收藏单词成功');
  });

  /**
   * 取消收藏
   */
  removeFavoriteWord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { entryId } = req.body as { entryId: number };
    const favorites = await wordBookService.removeFavoriteWord({
      bookId: Number(id),
      entryId: Number(entryId),
    });
    return ResponseUtil.success(res, favorites, '已移除收藏单词');
  });

  /**
   * 获取错题列表
   */
  listWrongWords = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const wrongWords = await wordBookService.listWrongWords(Number(id));
    return ResponseUtil.success(res, wrongWords, '获取错题列表成功');
  });

  /**
   * 记录错题
   */
  addWrongWord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { entryId } = req.body as { entryId: number };
    const wrongWords = await wordBookService.addWrongWord({
      bookId: Number(id),
      entryId: Number(entryId),
    });
    return ResponseUtil.success(res, wrongWords, '已记录错题');
  });

  /**
   * 移除错题
   */
  removeWrongWord = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { entryId } = req.body as { entryId: number };
    const wrongWords = await wordBookService.removeWrongWord({
      bookId: Number(id),
      entryId: Number(entryId),
    });
    return ResponseUtil.success(res, wrongWords, '已移除错题');
  });

  /**
   * 获取单词书学习进度
   */
  getWordBookProgress = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await wordBookService.getWordBookProgress(Number(id));
    return ResponseUtil.success(res, result, '获取学习进度成功');
  });

  /**
   * 保存单词书学习进度
   */
  saveWordBookProgress = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { completedCount, currentIndex, currentEntryId, totalWords, notes } = req.body as {
      completedCount?: number;
      currentIndex?: number;
      currentEntryId?: number | null;
      totalWords?: number;
      notes?: string | null;
    };

    const result = await wordBookService.upsertWordBookProgress({
      bookId: Number(id),
      completedCount,
      currentIndex,
      currentEntryId,
      totalWords,
      notes,
    });

    return ResponseUtil.success(res, result, '保存学习进度成功');
  });

  /**
   * 重置单词书学习进度
   */
  resetWordBookProgress = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await wordBookService.resetWordBookProgress(Number(id));
    return ResponseUtil.success(res, result, '学习进度已重置');
  });

}

export const wordBookController = new WordBookController();
