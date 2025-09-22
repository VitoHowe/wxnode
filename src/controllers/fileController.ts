import { Request, Response } from 'express';
import { fileService } from '@/services/fileService';
import { asyncHandler, NotFoundError, ValidationError } from '@/middleware/errorHandler';

class FileController {
  /**
   * 上传文件
   */
  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('请选择要上传的文件');
    }

    if (!req.user) {
      throw new ValidationError('用户未登录');
    }

    const { name, description } = req.body;

    const result = await fileService.uploadFile({
      file: req.file,
      name,
      description,
      userId: req.user.userId,
    });

    res.status(200).json({
      code: 200,
      message: '文件上传成功',
      data: result,
    });
  });

  /**
   * 获取文件列表
   */
  getFiles = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;

    if (!req.user) {
      throw new ValidationError('用户未登录');
    }

    const result = await fileService.getFiles({
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      userId: req.user.userId,
    });

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: result,
    });
  });

  /**
   * 根据ID获取文件
   */
  getFileById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const file = await fileService.getFileById(Number(id));
    
    if (!file) {
      throw new NotFoundError('文件不存在');
    }

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: file,
    });
  });

  /**
   * 解析文件
   */
  parseFile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await fileService.parseFile(Number(id));

    res.status(200).json({
      code: 200,
      message: '解析任务已启动',
      data: result,
    });
  });

  /**
   * 获取解析状态
   */
  getParseStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const status = await fileService.getParseStatus(Number(id));

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: status,
    });
  });

  /**
   * 删除文件
   */
  deleteFile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await fileService.deleteFile(Number(id));

    res.status(200).json({
      code: 200,
      message: '删除成功',
      data: null,
    });
  });
}

export const fileController = new FileController();
