import { Request, Response } from 'express';
import { userService } from '@/services/userService';
import { asyncHandler, NotFoundError } from '@/middleware/errorHandler';
import { ResponseUtil } from '@/utils/response';

class UserController {
  /**
   * 获取用户列表
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, keyword } = req.query;

    const result = await userService.getUsers({
      page: Number(page),
      limit: Number(limit),
      keyword: keyword as string,
    });

    return ResponseUtil.success(res, result, '获取成功');
  });

  /**
   * 根据ID获取用户
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await userService.getUserById(Number(id));
    
    if (!user) {
      return ResponseUtil.notFoundError(res, '用户不存在');
    }

    return ResponseUtil.success(res, user, '获取成功');
  });

  /**
   * 更新用户
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const user = await userService.updateUser(Number(id), updateData);

    return ResponseUtil.success(res, user, '更新成功');
  });

  /**
   * 删除用户
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await userService.deleteUser(Number(id));

    return ResponseUtil.success(res, null, '删除成功');
  });

  /**
   * 设置用户角色（仅超级管理员）
   */
  setUserRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body as { role: 'user' | 'admin' | 'super_admin' };

    // 查角色ID
    const roleRow = await userService.getRoleByName(role);
    if (!roleRow) {
      return ResponseUtil.notFoundError(res, '角色不存在');
    }

    // 更新用户角色
    const updated = await userService.updateUser(Number(id), { role_id: roleRow.id });

    return ResponseUtil.success(res, updated, '角色更新成功');
  });
}

export const userController = new UserController();
