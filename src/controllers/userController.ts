import { Request, Response } from 'express';
import { userService } from '@/services/userService';
import { asyncHandler, NotFoundError } from '@/middleware/errorHandler';

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

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: result,
    });
  });

  /**
   * 根据ID获取用户
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await userService.getUserById(Number(id));
    
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    res.status(200).json({
      code: 200,
      message: '获取成功',
      data: user,
    });
  });

  /**
   * 更新用户
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const user = await userService.updateUser(Number(id), updateData);

    res.status(200).json({
      code: 200,
      message: '更新成功',
      data: user,
    });
  });

  /**
   * 删除用户
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await userService.deleteUser(Number(id));

    res.status(200).json({
      code: 200,
      message: '删除成功',
      data: null,
    });
  });
}

export const userController = new UserController();
