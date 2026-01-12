import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { wordPracticeService } from '@/services/wordPracticeService';

class WordPracticeController {
  /**
   * 获取带进度的单词列表
   */
  getWordsWithProgress = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const { bookId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const data = await wordPracticeService.getWordsWithProgress(req.user.userId, Number(bookId), {
      page: Number(page),
      limit: Number(limit),
    });
    return ResponseUtil.success(res, data, '获取单词列表成功');
  });

  /**
   * 获取进度摘要
   */
  getBookProgress = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const { bookId } = req.params;
    const summary = await wordPracticeService.getBookProgressSummary(req.user.userId, Number(bookId));
    return ResponseUtil.success(res, summary, '获取进度摘要成功');
  });

  /**
   * 更新单词进度（收藏/掌握/错题）
   */
  updateWordProgress = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const { bookId } = req.params;
    const { word_entry_id, status, is_favorite, wrong_delta } = req.body as {
      word_entry_id: number;
      status?: 'pending' | 'review' | 'mastered';
      is_favorite?: boolean;
      wrong_delta?: number;
    };

    await wordPracticeService.upsertWordProgress(req.user.userId, Number(bookId), word_entry_id, {
      status,
      is_favorite,
      wrong_delta,
    });
    return ResponseUtil.success(res, null, '更新单词进度成功');
  });

  /**
   * 保存学习位置
   */
  saveBookState = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const { bookId } = req.params;
    const { last_word_entry_id, last_word_order_index } = req.body as {
      last_word_entry_id?: number | null;
      last_word_order_index?: number | null;
    };
    await wordPracticeService.saveBookState(req.user.userId, Number(bookId), {
      last_word_entry_id: last_word_entry_id ?? null,
      last_word_order_index: last_word_order_index ?? null,
    });
    return ResponseUtil.success(res, null, '保存学习位置成功');
  });

  /**
   * 获取学习位置
   */
  getBookState = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const { bookId } = req.params;
    const state = await wordPracticeService.getBookState(req.user.userId, Number(bookId));
    return ResponseUtil.success(res, state, '获取学习位置成功');
  });
}

export const wordPracticeController = new WordPracticeController();
