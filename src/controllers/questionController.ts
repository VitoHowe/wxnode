import { Request, Response } from 'express';
import { questionService } from '@/services/questionService';
import { asyncHandler, NotFoundError } from '@/middleware/errorHandler';

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

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: result,
    });
  });

  /**
   * 根据ID获取题目
   */
  getQuestionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const question = await questionService.getQuestionById(Number(id));
    
    if (!question) {
      throw new NotFoundError('题目不存在');
    }

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: question,
    });
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

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: result,
    });
  });

  /**
   * 根据ID获取题库
   */
  getQuestionBankById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const bank = await questionService.getQuestionBankById(Number(id));
    
    if (!bank) {
      throw new NotFoundError('题库不存在');
    }

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: bank,
    });
  });

  /**
   * 更新题目
   */
  updateQuestion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const question = await questionService.updateQuestion(Number(id), updateData);

    res.status(200).json({
      code: 200,
      message: '更新成功',
      data: question,
    });
  });

  /**
   * 删除题目
   */
  deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await questionService.deleteQuestion(Number(id));

    res.status(200).json({
      code: 200,
      message: '删除成功',
      data: null,
    });
  });
}

export const questionController = new QuestionController();
