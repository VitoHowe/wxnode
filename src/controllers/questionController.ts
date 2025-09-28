import { Request, Response } from 'express';
import { questionService } from '@/services/questionService';
import { asyncHandler, NotFoundError } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';

class QuestionController {
  /**
   * 获取题目列表
   */
  getQuestions = asyncHandler(async (req: Request, res: Response) => {
    const { bank_id, type, difficulty, keyword, page = 1, limit = 20 } = req.query;

    const result = await questionService.getQuestions({
      bank_id: bank_id ? Number(bank_id) : undefined,
      type: type as string,
      difficulty: difficulty ? Number(difficulty) : undefined,
      keyword: keyword as string,
      page: Number(page),
      limit: Number(limit),
    });

    return ResponseUtil.success(res, result, '获取成功');
  });

  /**
   * 根据ID获取题目
   */
  getQuestionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const question = await questionService.getQuestionById(Number(id));
    
    if (!question) {
      return ResponseUtil.notFoundError(res, '题目不存在');
    }

    return ResponseUtil.success(res, question, '获取成功');
  });

  /**
   * 获取题库列表
   */
  getQuestionBanks = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await questionService.getQuestionBanks({
      page: Number(page),
      limit: Number(limit),
    });

    return ResponseUtil.success(res, result, '获取成功');
  });

  /**
   * 根据ID获取题库
   */
  getQuestionBankById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const questionBank = await questionService.getQuestionBankById(Number(id));
    
    if (!questionBank) {
      return ResponseUtil.notFoundError(res, '题库不存在');
    }

    return ResponseUtil.success(res, questionBank, '获取成功');
  });

  /**
   * 批量创建题目
   */
  createQuestions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const { bankId, questions } = req.body;

    if (!bankId || !questions || !Array.isArray(questions)) {
      return ResponseUtil.validationError(res, '请提供题库ID和题目数组');
    }

    await questionService.createQuestions(bankId, questions);

    return ResponseUtil.success(res, null, '批量创建成功', 201);
  });

  /**
   * 更新题目
   */
  updateQuestion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const result = await questionService.updateQuestion(Number(id), req.body);

    return ResponseUtil.success(res, result, '更新成功');
  });

  /**
   * 删除题目
   */
  deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    await questionService.deleteQuestion(Number(id));

    return ResponseUtil.success(res, null, '删除成功');
  });
}

export const questionController = new QuestionController();
