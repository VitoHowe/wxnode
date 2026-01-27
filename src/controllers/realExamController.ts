import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { realExamService } from '@/services/realExamService';

class RealExamController {
  listPapers = asyncHandler(async (req: Request, res: Response) => {
    const { subjectId, page = 1, limit = 20 } = req.query;
    const result = await realExamService.listPapers({
      subjectId: Number(subjectId),
      page: Number(page),
      limit: Number(limit),
    });
    return ResponseUtil.success(res, result, '获取试卷列表成功');
  });

  getPaperQuestions = asyncHandler(async (req: Request, res: Response) => {
    const paperId = Number(req.params.paperId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
    const questionNumber = req.query.questionNumber ? parseInt(req.query.questionNumber as string) : undefined;

    const result = await realExamService.getPaperQuestions(paperId, page, limit, questionNumber);

    if (questionNumber !== undefined && !result.question) {
      return ResponseUtil.success(res, { total: result.total }, '没有更多题目了');
    }

    return ResponseUtil.success(
      res,
      result,
      questionNumber !== undefined ? '获取题目成功' : '获取试卷题目成功'
    );
  });

  submitAttempt = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const paperId = Number(req.params.paperId);
    const result = await realExamService.submitAttempt({
      userId: req.user.userId,
      paperId,
      ...req.body,
    });
    return ResponseUtil.success(res, result, '提交答题结果成功', 201);
  });

  getWrongQuestions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const paperId = Number(req.params.paperId);
    const result = await realExamService.getWrongQuestions(req.user.userId, paperId);
    return ResponseUtil.success(res, { questions: result }, '获取错题成功');
  });
}

export const realExamController = new RealExamController();
