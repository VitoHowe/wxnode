import { Router } from 'express';
import { questionController } from '@/controllers/questionController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

// 所有题目路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/questions:
 *   get:
 *     tags: [题库管理]
 *     summary: 获取题目列表
 *     description: 获取题库中的题目列表，支持筛选和分页
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bank_id
 *         schema:
 *           type: integer
 *         description: 题库ID筛选
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [single, multiple, judge, fill, essay]
 *         description: 题目类型筛选
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 3
 *         description: 难度等级筛选
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 关键词搜索
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "获取成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: 未登录
 */
router.get('/', validateRequest(validationSchemas.questionQuery), questionController.getQuestions);

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

/**
 * @swagger
 * /api/questions/{id}:
 *   get:
 *     tags: [题库管理]
 *     summary: 获取题目详情
 *     description: 根据题目ID获取详细信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题目ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 题目不存在
 */
router.get('/:id', validateRequest(validationSchemas.idParam), questionController.getQuestionById);

/**
 * @swagger
 * /api/questions/{id}:
 *   put:
 *     tags: [题库管理]
 *     summary: 更新题目
 *     description: 更新指定题目的信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题目ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: 题目内容
 *               options:
 *                 type: array
 *                 description: 选项（选择题）
 *               answer:
 *                 type: string
 *                 description: 答案
 *               explanation:
 *                 type: string
 *                 description: 解析
 *               difficulty:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *                 description: 难度等级
 *               tags:
 *                 type: array
 *                 description: 标签
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 题目不存在
 */
router.put('/:id', validateRequest(validationSchemas.idParam), questionController.updateQuestion);

/**
 * @swagger
 * /api/questions/{id}:
 *   delete:
 *     tags: [题库管理]
 *     summary: 删除题目
 *     description: 删除指定的题目
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题目ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 题目不存在
 */
router.delete('/:id', validateRequest(validationSchemas.idParam), questionController.deleteQuestion);

export default router;
