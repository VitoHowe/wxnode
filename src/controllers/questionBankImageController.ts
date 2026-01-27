import { Request, Response } from 'express';
import { asyncHandler, ValidationError } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { questionBankImageService } from '@/services/questionBankImageService';

class QuestionBankImageController {
  listImages = asyncHandler(async (req: Request, res: Response) => {
    const bankId = Number(req.params.bankId);
    const forwardedProto = req.headers['x-forwarded-proto'] as string | undefined;
    const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
    const protocol = forwardedProto || req.protocol;
    const host = forwardedHost || req.get('host');
    const baseUrl = host ? `${protocol}://${host}` : undefined;
    const result = await questionBankImageService.listImages(bankId, baseUrl);
    return ResponseUtil.success(res, result, '获取题库图片成功');
  });

  uploadImages = asyncHandler(async (req: Request, res: Response) => {
    const bankId = Number(req.params.bankId);
    const overwrite = req.query.overwrite === '1';
    const files: Express.Multer.File[] = [];

    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
      Object.values(req.files).forEach((list) => {
        files.push(...(list as Express.Multer.File[]));
      });
    }

    if (files.length === 0) {
      throw new ValidationError('请先选择图片文件');
    }

    const result = await questionBankImageService.uploadImages(bankId, files, { overwrite });
    return ResponseUtil.success(res, result, '图片上传成功');
  });

  renameImage = asyncHandler(async (req: Request, res: Response) => {
    const bankId = Number(req.params.bankId);
    const filename = req.params.filename;
    const { newFilename, overwrite } = req.body;
    const result = await questionBankImageService.renameImage(bankId, filename, newFilename, {
      overwrite: overwrite === 1 || overwrite === true,
    });
    return ResponseUtil.success(res, result, '图片更新成功');
  });

  deleteImage = asyncHandler(async (req: Request, res: Response) => {
    const bankId = Number(req.params.bankId);
    const filename = req.params.filename;
    const force = req.query.force === '1';
    const result = await questionBankImageService.deleteImage(bankId, filename, { force });
    return ResponseUtil.success(res, result, '图片删除成功');
  });
}

export const questionBankImageController = new QuestionBankImageController();
