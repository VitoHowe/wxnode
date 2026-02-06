import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { practiceService, PracticeMode, PracticeQuestionSource, PracticeSourceType } from '@/services/practiceService';

class PracticeController {
  createAttempt = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const {
      subject_id,
      mode,
      source_type,
      source_id,
      total_questions,
      correct_count,
      wrong_count,
      accuracy,
      question_source,
      question_ids,
      wrong_questions,
    } = req.body;

    const result = await practiceService.createPracticeAttempt({
      userId,
      subjectId: Number(subject_id),
      mode: mode as PracticeMode,
      sourceType: source_type as PracticeSourceType,
      sourceId: Number(source_id),
      totalQuestions: Number(total_questions),
      correctCount: Number(correct_count),
      wrongCount: Number(wrong_count),
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      questionSource: question_source as PracticeQuestionSource,
      questionIds: Array.isArray(question_ids) ? question_ids.map((id: any) => Number(id)) : [],
      wrongQuestions: Array.isArray(wrong_questions) ? wrong_questions : [],
    });

    return ResponseUtil.success(res, result, '保存练习统计成功', 201);
  });

  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const subjectId = Number(req.query.subjectId);
    const mode = req.query.mode ? String(req.query.mode) : undefined;
    const data = await practiceService.getSummary(userId, subjectId, mode as PracticeMode | undefined);
    return ResponseUtil.success(res, data, '获取练习统计成功');
  });

  listWrongQuestions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const subjectId = Number(req.query.subjectId);
    const mode = req.query.mode ? String(req.query.mode) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const data = await practiceService.listWrongQuestions({
      userId,
      subjectId,
      mode: mode as PracticeMode | undefined,
      page,
      limit,
    });

    return ResponseUtil.success(res, data, '获取错题集成功');
  });

  deleteWrongQuestion = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const wrongId = Number(req.params.id);
    const removed = await practiceService.deleteWrongQuestion(userId, wrongId);
    if (!removed) {
      return ResponseUtil.notFoundError(res, '错题不存在或无权限');
    }

    return ResponseUtil.success(res, null, '已移除错题');
  });
}

export const practiceController = new PracticeController();
