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
   * 获取章节详情（验证题库归属）
   */
  async getChapterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bankId = parseInt(req.params.bankId);
      const chapterId = parseInt(req.params.chapterId);
      
      const chapter = await chapterService.getChapterByBankIdAndChapterId(bankId, chapterId);
      
      if (!chapter) {
        ResponseUtil.notFoundError(res, '章节不存在或不属于该题库');
        return;
      }
      
      ResponseUtil.success(res, chapter, '获取章节详情成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取章节的题目列表（支持分页、全量、单题模式，验证题库归属）
   */
  async getChapterQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bankId = parseInt(req.params.bankId);
      const chapterId = parseInt(req.params.chapterId);
      const page = parseInt(req.query.page as string) || 1;
      // limit参数：不传或传0表示返回全部（答题场景），传具体数值表示分页（管理场景）
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
      // questionNumber参数：题号（从1开始），传入时返回单个题目（逐题答题场景）
      const questionNumber = req.query.questionNumber ? parseInt(req.query.questionNumber as string) : undefined;
      
      // 验证章节是否属于该题库
      const chapter = await chapterService.getChapterByBankIdAndChapterId(bankId, chapterId);
      if (!chapter) {
        ResponseUtil.notFoundError(res, '章节不存在或不属于该题库');
        return;
      }
      
      const result = await questionService.getQuestionsByChapterId(chapterId, page, limit, questionNumber);
      
      // 单题模式且超出范围
      if (questionNumber !== undefined && !result.question) {
        ResponseUtil.success(res, { total: result.total }, '没有更多题目了');
        return;
      }
      
      ResponseUtil.success(res, result, questionNumber !== undefined ? '获取题目成功' : '获取章节题目成功');
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
   * 删除章节（级联删除题目，验证题库归属）
   */
  async deleteChapter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bankId = parseInt(req.params.bankId);
      const chapterId = parseInt(req.params.chapterId);
      
      // 验证章节是否属于该题库
      const chapter = await chapterService.getChapterByBankIdAndChapterId(bankId, chapterId);
      if (!chapter) {
        ResponseUtil.notFoundError(res, '章节不存在或不属于该题库');
        return;
      }
      
      await chapterService.deleteChapter(chapterId);
      
      ResponseUtil.success(res, null, '删除章节成功');
    } catch (error) {
      next(error);
    }
  }
}

export const chapterController = new ChapterController();
