import { Request, Response } from 'express';
import { asyncHandler, NotFoundError } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { subjectService } from '@/services/subjectService';
import { subjectChapterService } from '@/services/subjectChapterService';
import { questionService } from '@/services/questionService';
import { userProgressService } from '@/services/userProgressService';

class SubjectController {
  listSubjects = asyncHandler(async (_req: Request, res: Response) => {
    const subjects = await subjectService.listSubjects();
    return ResponseUtil.success(res, { subjects }, '获取科目成功');
  });

  listAllSubjects = asyncHandler(async (_req: Request, res: Response) => {
    const subjects = await subjectService.listSubjects({ includeDisabled: true });
    return ResponseUtil.success(res, { subjects }, '获取科目成功');
  });

  getSubjectById = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const subject = await subjectService.getSubjectById(subjectId);
    if (!subject) {
      throw new NotFoundError('科目不存在');
    }
    return ResponseUtil.success(res, subject, '获取科目成功');
  });

  createSubject = asyncHandler(async (req: Request, res: Response) => {
    const created = await subjectService.createSubject(req.body);
    return ResponseUtil.success(res, created, '创建科目成功', 201);
  });

  updateSubject = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const updated = await subjectService.updateSubject(subjectId, req.body);
    return ResponseUtil.success(res, updated, '更新科目成功');
  });

  listSubjectChapters = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const includeDisabled = req.query.includeDisabled === '1';
    const chapters = await subjectChapterService.listSubjectChapters(subjectId, {
      includeDisabled,
    });
    return ResponseUtil.success(res, { chapters }, '获取章节成功');
  });

  listSubjectChapterAliases = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const aliases = await subjectChapterService.listSubjectChapterAliases(subjectId);
    return ResponseUtil.success(res, { aliases }, '获取章节别名成功');
  });

  createSubjectChapter = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const created = await subjectChapterService.createSubjectChapter(subjectId, req.body);
    return ResponseUtil.success(res, created, '创建章节成功', 201);
  });

  createSubjectChapterAlias = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const created = await subjectChapterService.createSubjectChapterAlias(subjectId, req.body);
    return ResponseUtil.success(res, created, '创建章节别名成功', 201);
  });

  updateSubjectChapter = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const chapterId = Number(req.params.chapterId);
    const updated = await subjectChapterService.updateSubjectChapter(subjectId, chapterId, req.body);
    return ResponseUtil.success(res, updated, '更新章节成功');
  });

  deleteSubjectChapterAlias = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const aliasId = Number(req.params.aliasId);
    await subjectChapterService.deleteSubjectChapterAlias(subjectId, aliasId);
    return ResponseUtil.success(res, {}, '删除章节别名成功');
  });

  syncSubjectChapters = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const result = await subjectChapterService.syncSubjectChaptersFromBanks(subjectId);
    return ResponseUtil.success(res, result, '同步章节成功');
  });

  getSubjectBanks = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    const result = await questionService.getQuestionBanks({
      page: Number(page),
      limit: Number(limit),
      subjectId,
      userId,
    });

    return ResponseUtil.success(res, result, '获取题库列表成功');
  });

  getSubjectChapterQuestions = asyncHandler(async (req: Request, res: Response) => {
    const subjectChapterId = Number(req.params.chapterId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
    const questionNumber = req.query.questionNumber ? parseInt(req.query.questionNumber as string) : undefined;

    const result = await questionService.getQuestionsBySubjectChapterId(
      subjectChapterId,
      page,
      limit,
      questionNumber
    );

    if (questionNumber !== undefined && !result.question) {
      return ResponseUtil.success(res, { total: result.total }, '没有更多题目了');
    }

    return ResponseUtil.success(
      res,
      result,
      questionNumber !== undefined ? '获取题目成功' : '获取章节题目成功'
    );
  });

  getSubjectRandomQuestions = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const count = req.query.count ? Number(req.query.count) : 10;
    const questions = await questionService.getRandomQuestionsBySubject(subjectId, count);
    return ResponseUtil.success(res, { questions, total: questions.length }, '获取随机题目成功');
  });

  getSubjectChaptersProgress = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const progressList = await userProgressService.getSubjectChaptersProgress(userId, subjectId);
    return ResponseUtil.success(res, progressList, '获取专项章节进度成功');
  });

  saveSubjectChapterProgress = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.params.subjectId);
    const subjectChapterId = Number(req.params.chapterId);
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const { current_question_number, completed_count, total_questions } = req.body;
    const progress = await userProgressService.saveSubjectChapterProgress(userId, subjectId, subjectChapterId, {
      current_question_number,
      completed_count,
      total_questions,
    });

    return ResponseUtil.success(res, progress, '保存专项章节进度成功');
  });
}

export const subjectController = new SubjectController();
