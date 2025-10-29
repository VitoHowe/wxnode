import { Request, Response, NextFunction } from 'express';
import { chapterService } from '@/services/chapterService';
import { questionService } from '@/services/questionService';
import { ResponseUtil } from '@/utils/response';
import { logger } from '@/utils/logger';

class ChapterController {
  /**
   * 获取题库的所有章节
   */
  async getChaptersByBankId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bankId = parseInt(req.params.bankId);
      
      const chapters = await chapterService.getChaptersByBankId(bankId);
      
      ResponseUtil.success(res, {
        chapters,
        totalChapters: chapters.length,
      }, '获取题库章节成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取章节详情
   */
  async getChapterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chapterId = parseInt(req.params.chapterId);
      
      const chapter = await chapterService.getChapterById(chapterId);
      
      if (!chapter) {
        ResponseUtil.notFoundError(res, '章节不存在');
        return;
      }
      
      ResponseUtil.success(res, chapter, '获取章节详情成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取章节的题目列表（支持分页）
   */
  async getChapterQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await questionService.getQuestionsByChapterId(chapterId, page, limit);
      
      ResponseUtil.success(res, result, '获取章节题目成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取题库章节统计
   */
  async getBankChapterStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bankId = parseInt(req.params.bankId);
      
      const stats = await chapterService.getBankChapterStats(bankId);
      
      ResponseUtil.success(res, stats, '获取题库章节统计成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除章节（级联删除题目）
   */
  async deleteChapter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chapterId = parseInt(req.params.chapterId);
      
      await chapterService.deleteChapter(chapterId);
      
      ResponseUtil.success(res, null, '删除章节成功');
    } catch (error) {
      next(error);
    }
  }
}

export const chapterController = new ChapterController();
