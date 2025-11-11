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
}

export const wordBookController = new WordBookController();
