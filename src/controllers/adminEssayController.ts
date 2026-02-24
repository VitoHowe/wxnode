import fs from 'fs';
import { Request, Response } from 'express';
import { asyncHandler, ValidationError } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';
import { adminEssayService } from '@/services/adminEssayService';

class AdminEssayController {
  private cleanupTempFile(file?: Express.Multer.File) {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }

  listEssayOrgs = asyncHandler(async (req: Request, res: Response) => {
    const includeDisabled = req.query.includeDisabled === '1';
    const orgs = await adminEssayService.listEssayOrgs({ includeDisabled });
    return ResponseUtil.success(res, { orgs }, '获取机构列表成功');
  });

  createEssayOrg = asyncHandler(async (req: Request, res: Response) => {
    const created = await adminEssayService.createEssayOrg(req.body);
    return ResponseUtil.success(res, created, '创建机构成功', 201);
  });

  updateEssayOrg = asyncHandler(async (req: Request, res: Response) => {
    const orgId = Number(req.params.orgId);
    const updated = await adminEssayService.updateEssayOrg(orgId, req.body);
    return ResponseUtil.success(res, updated, '更新机构成功');
  });

  deleteEssayOrg = asyncHandler(async (req: Request, res: Response) => {
    const orgId = Number(req.params.orgId);
    await adminEssayService.deleteEssayOrg(orgId);
    return ResponseUtil.success(res, null, '删除机构成功');
  });

  listEssays = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, orgId, subjectId, subjectChapterId, status, keyword } = req.query;
    const result = await adminEssayService.listEssays({
      page: Number(page),
      limit: Number(limit),
      orgId: orgId ? Number(orgId) : undefined,
      subjectId: subjectId ? Number(subjectId) : undefined,
      subjectChapterId: subjectChapterId ? Number(subjectChapterId) : undefined,
      status: status !== undefined ? Number(status) : undefined,
      keyword: keyword ? String(keyword) : undefined,
    });
    return ResponseUtil.success(res, result, '获取论文列表成功');
  });

  listEssayPermissionUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 50, keyword, includeDisabled } = req.query;
    const result = await adminEssayService.listEssayPermissionUsers({
      page: Number(page),
      limit: Number(limit),
      keyword: keyword ? String(keyword) : undefined,
      includeDisabled: includeDisabled === '1',
    });
    return ResponseUtil.success(res, result, '获取可授权用户成功');
  });

  getSubjectEssayPermission = asyncHandler(async (req: Request, res: Response) => {
    const subjectId = Number(req.query.subjectId);
    const permission = await adminEssayService.getSubjectEssayPermission(subjectId);
    return ResponseUtil.success(res, permission, '获取论文权限成功');
  });

  saveSubjectEssayPermission = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    const { subjectId, userIds } = req.body;
    const permission = await adminEssayService.saveSubjectEssayPermission(
      Number(subjectId),
      Array.isArray(userIds) ? userIds.map((item) => Number(item)) : [],
      req.user.userId
    );
    return ResponseUtil.success(res, permission, '保存论文权限成功');
  });

  createEssay = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('请上传 Markdown 文件');
    }
    if (!req.user) {
      return ResponseUtil.authError(res, '用户未登录');
    }

    try {
      const { title, orgId, subjectId, subjectChapterId, status } = req.body;
      const created = await adminEssayService.createEssay({
        title: String(title),
        orgId: Number(orgId),
        subjectId: Number(subjectId),
        subjectChapterId: Number(subjectChapterId),
        status: status !== undefined ? Number(status) : 1,
        createdBy: req.user.userId,
        file: req.file,
      });
      return ResponseUtil.success(res, created, '创建论文成功', 201);
    } catch (error) {
      this.cleanupTempFile(req.file);
      throw error;
    }
  });

  updateEssay = asyncHandler(async (req: Request, res: Response) => {
    const essayId = Number(req.params.id);

    try {
      const { title, orgId, subjectId, subjectChapterId, status } = req.body || {};
      const updated = await adminEssayService.updateEssay({
        id: essayId,
        title: title !== undefined ? String(title) : undefined,
        orgId: orgId !== undefined ? Number(orgId) : undefined,
        subjectId: subjectId !== undefined ? Number(subjectId) : undefined,
        subjectChapterId: subjectChapterId !== undefined ? Number(subjectChapterId) : undefined,
        status: status !== undefined ? Number(status) : undefined,
        file: req.file || undefined,
      });
      return ResponseUtil.success(res, updated, '更新论文成功');
    } catch (error) {
      this.cleanupTempFile(req.file);
      throw error;
    }
  });

  deleteEssay = asyncHandler(async (req: Request, res: Response) => {
    const essayId = Number(req.params.id);
    await adminEssayService.deleteEssay(essayId);
    return ResponseUtil.success(res, null, '删除论文成功');
  });
}

export const adminEssayController = new AdminEssayController();
