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
router.get('/:bankId/chapters', chapterController.getChaptersByBankId);

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
router.get('/:bankId/chapters/stats', chapterController.getBankChapterStats);

/**
 * @swagger
 * /api/question-banks/{bankId}/chapters/{chapterId}:
 *   get:
 *     tags: [章节管理]
 *     summary: 获取章节详情
 *     description: 获取指定题库的指定章节详细信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题库ID
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
 *         description: 章节不存在或不属于该题库
 */
router.get('/:bankId/chapters/:chapterId', chapterController.getChapterById);

/**
 * @swagger
 * /api/question-banks/{bankId}/chapters/{chapterId}/questions:
 *   get:
 *     tags: [章节管理]
 *     summary: 获取章节的题目列表
 *     description: 获取指定题库的指定章节的题目，支持分页和全量获取。默认返回全部题目（适合答题场景），设置limit可分页查询
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题库ID
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
 *         description: 页码（仅在limit>0时有效）
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           default: 0
 *         description: 每页数量，0表示返回全部（答题场景），>0表示分页查询（管理场景）
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
 *                     total:
 *                       type: integer
 *                       description: 该章节的题目总数
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
 *       404:
 *         description: 章节不存在或不属于该题库
 */
router.get('/:bankId/chapters/:chapterId/questions', chapterController.getChapterQuestions);

/**
 * @swagger
 * /api/question-banks/{bankId}/chapters/{chapterId}:
 *   delete:
 *     tags: [章节管理]
 *     summary: 删除章节
 *     description: 删除指定题库的指定章节（级联删除该章节下的所有题目）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 题库ID
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
 *         description: 章节不存在或不属于该题库
 */
router.delete('/:bankId/chapters/:chapterId', chapterController.deleteChapter);

export default router;
