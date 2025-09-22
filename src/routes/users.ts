import { Router } from 'express';
import { userController } from '@/controllers/userController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

// 所有用户路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [用户管理]
 *     summary: 获取用户列表
 *     description: 获取系统中的用户列表（管理员权限）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 *       403:
 *         description: 权限不足
 */
router.get('/', requireAdmin, validateRequest(validationSchemas.pagination), userController.getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [用户管理]
 *     summary: 获取用户详情
 *     description: 根据用户ID获取用户详细信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 用户不存在
 */
router.get('/:id', validateRequest(validationSchemas.idParam), userController.getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [用户管理]
 *     summary: 更新用户信息
 *     description: 更新指定用户的信息（管理员权限）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               role_id:
 *                 type: integer
 *               status:
 *                 type: integer
 *                 enum: [0, 1]
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未登录
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 */
router.put('/:id', requireAdmin, validateRequest(validationSchemas.idParam), userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [用户管理]
 *     summary: 删除用户
 *     description: 删除指定用户（管理员权限）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       401:
 *         description: 未登录
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 */
router.delete('/:id', requireAdmin, validateRequest(validationSchemas.idParam), userController.deleteUser);

export default router;
