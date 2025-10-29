import { Router } from 'express';
import { chapterController } from '@/controllers/chapterController';
import { authenticateToken } from '@/middleware/auth';

const router: Router = Router();

// 所有章节路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/question-banks/{bankId}/chapters:
 *   get:
 *     tags: [章节管理]
 *     summary: 获取题库的所有章节
 *     description: 获取指定题库的章节列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题库ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "获取题库章节成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     chapters:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           bank_id:
 *                             type: integer
 *                           chapter_name:
 *                             type: string
 *                           chapter_order:
 *                             type: integer
 *                           question_count:
 *                             type: integer
 *                     totalChapters:
 *                       type: integer
 *       401:
 *         description: 未登录
 */
router.get('/banks/:bankId/chapters', chapterController.getChaptersByBankId);

/**
 * @swagger
 * /api/question-banks/{bankId}/chapters/stats:
 *   get:
 *     tags: [章节管理]
 *     summary: 获取题库章节统计
 *     description: 获取题库的章节统计信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题库ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 */
router.get('/banks/:bankId/chapters/stats', chapterController.getBankChapterStats);

/**
 * @swagger
 * /api/chapters/{chapterId}:
 *   get:
 *     tags: [章节管理]
 *     summary: 获取章节详情
 *     description: 获取指定章节的详细信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 章节ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 章节不存在
 */
router.get('/:chapterId', chapterController.getChapterById);

/**
 * @swagger
 * /api/chapters/{chapterId}/questions:
 *   get:
 *     tags: [章节管理]
 *     summary: 获取章节的题目列表
 *     description: 获取指定章节的题目，支持分页
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 章节ID
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
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "获取章节题目成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: 未登录
 */
router.get('/:chapterId/questions', chapterController.getChapterQuestions);

/**
 * @swagger
 * /api/chapters/{chapterId}:
 *   delete:
 *     tags: [章节管理]
 *     summary: 删除章节
 *     description: 删除指定章节（级联删除该章节下的所有题目）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 章节ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 章节不存在
 */
router.delete('/:chapterId', chapterController.deleteChapter);

export default router;
