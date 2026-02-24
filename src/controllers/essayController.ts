import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { essayService } from '@/services/essayService';

class EssayController {
  listSubjectEssayOrgs = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const subjectId = Number(req.params.subjectId);
    const orgs = await essayService.listSubjectEssayOrgs(subjectId, req.user.userId);
    return ResponseUtil.success(res, { orgs }, '获取机构列表成功');
  });

  listChapterEssays = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const subjectId = Number(req.params.subjectId);
    const chapterId = Number(req.params.chapterId);
    const orgId = Number(req.query.orgId);

    const essays = await essayService.listChapterEssays(subjectId, chapterId, orgId, req.user.userId);
    return ResponseUtil.success(res, { essays }, '获取论文列表成功');
  });

  listSubjectEssays = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const subjectId = Number(req.params.subjectId);
    const orgId = Number(req.query.orgId);
    const essays = await essayService.listSubjectEssays(subjectId, orgId, req.user.userId);
    return ResponseUtil.success(res, { essays }, '获取论文列表成功');
  });

  getEssayDetail = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const essayId = Number(req.params.id);
    const essay = await essayService.getEssayDetail(essayId, req.user.userId);
    return ResponseUtil.success(res, essay, '获取论文详情成功');
  });

  getEssaySource = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const essayId = Number(req.params.id);
    const sourcePath = await essayService.getEssaySourcePath(essayId, req.user.userId);
    return res.sendFile(sourcePath);
  });
}

export const essayController = new EssayController();
