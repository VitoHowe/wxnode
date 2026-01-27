import { Request, Response } from 'express';
import { markdownFileService } from '@/services/markdownFileService';
import { asyncHandler } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';

class MarkdownFileController {
  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return ResponseUtil.validationError(res, '请选择需要上传的 Markdown 文件');
    }

    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    const { name, description } = req.body;
    const result = await markdownFileService.uploadFile({
      file: req.file,
      name,
      description,
      userId: req.user.userId,
    });

    return ResponseUtil.success(res, result, 'Markdown 上传成功');
  });

  listFiles = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;

    const result = await markdownFileService.listFiles({
      page: Number(page),
      limit: Number(limit),
      status: status as string | undefined,
    });

    return ResponseUtil.success(res, result, '获取成功');
  });

  getFileById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await markdownFileService.getFileById(Number(id));
    if (!result) {
      return ResponseUtil.notFoundError(res, 'Markdown 文件不存在');
    }
    return ResponseUtil.success(res, result, '获取成功');
  });

  parseFile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await markdownFileService.parseFile(Number(id));
    return ResponseUtil.success(res, result, '解析完成');
  });

  listChapters = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await markdownFileService.listChapters(Number(id));
    return ResponseUtil.success(res, result, '获取成功');
  });

  deleteFile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await markdownFileService.deleteFile(Number(id));
    return ResponseUtil.success(res, null, '删除成功');
  });
}

export const markdownFileController = new MarkdownFileController();
