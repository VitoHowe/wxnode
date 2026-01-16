import { Router } from 'express';
import { questionController } from '@/controllers/questionController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

// 所有题目路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/questions/banks:
 *   get:
 *     tags: [题库管理]
 *     summary: 获取题库列表
 *     description: 获取所有可用的题库列表
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
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 */
router.get('/banks', validateRequest(validationSchemas.pagination), questionController.getQuestionBanks);

/**
 * @swagger
 * /api/questions/banks/{id}:
 *   get:
 *     tags: [题库管理]
 *     summary: 获取题库详情
 *     description: 根据题库ID获取详细信息和统计数据
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题库ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 题库不存在
 */
router.get('/banks/:id', validateRequest(validationSchemas.idParam), questionController.getQuestionBankById);

export default router;
