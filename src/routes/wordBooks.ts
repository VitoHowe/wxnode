import { Router } from 'express';
import { wordBookController } from '@/controllers/wordBookController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

// 所有单词书路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/word-books:
 *   get:
 *     tags: [单词书]
 *     summary: 获取单词书列表
 *     description: 支持分页与关键字过滤
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
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 关键字
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: 语言标识
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 */
router.get('/', validateRequest(validationSchemas.wordBookList), wordBookController.listWordBooks);

/**
 * @swagger
 * /api/word-books/{id}/words:
 *   get:
 *     tags: [单词书]
 *     summary: 获取单词书内容
 *     description: 获取指定单词书的单词条目列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 单词书 ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 单词书不存在
 */
router.get('/:id/words', validateRequest(validationSchemas.wordBookEntriesQuery), wordBookController.getWordBookWords);

export default router;
