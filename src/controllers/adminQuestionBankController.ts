import { Request, Response } from 'express';
import { asyncHandler, ValidationError } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { questionBankAdminService } from '@/services/questionBankAdminService';
import { fileService } from '@/services/fileService';

class AdminQuestionBankController {
  listQuestionBanks = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, subjectId } = req.query;
    const result = await questionBankAdminService.listQuestionBanks({
      page: Number(page),
      limit: Number(limit),
      subjectId: subjectId ? Number(subjectId) : undefined,
    });
    return ResponseUtil.success(res, result, '获取题库列表成功');
  });

  importBankJson = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('请选择要上传的JSON文件');
    }
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const { subjectId, name, description } = req.body;
    if (!subjectId) {
      throw new ValidationError('请先选择科目');
    }

    const result = await fileService.uploadJsonFile(req.file, req.user.userId, {
      subjectId: Number(subjectId),
      name,
      description,
    });

    return ResponseUtil.success(res, result, '题库导入成功');
  });

  importChapterJson = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('请选择要上传的JSON文件');
    }
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const bankId = Number(req.params.bankId);
    const { subjectChapterId } = req.body;
    if (!subjectChapterId) {
      throw new ValidationError('请先选择章节');
    }

    const result = await fileService.uploadChapterJsonFile({
      file: req.file,
      userId: req.user.userId,
      bankId,
      subjectChapterId: Number(subjectChapterId),
    });

    return ResponseUtil.success(res, result, '章节导入成功');
  });

  getBankSubjectChapters = asyncHandler(async (req: Request, res: Response) => {
    const bankId = Number(req.params.bankId);
    const chapters = await questionBankAdminService.getBankSubjectChapters(bankId);
    return ResponseUtil.success(res, { chapters }, '获取章节题量成功');
  });
}

export const adminQuestionBankController = new AdminQuestionBankController();
