import { Router } from 'express';
import { systemController } from '@/controllers/systemController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * tags:
 *   name: 系统设置
 *   description: 系统配置与解析模板管理
 */

/**
 * @swagger
 * /api/system/models:
 *   get:
 *     tags: [系统设置]
 *     summary: 获取模型配置列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/models', systemController.listModelConfigs);

/**
 * @swagger
 * /api/system/models/{id}:
 *   get:
 *     tags: [系统设置]
 *     summary: 获取模型配置详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 模型配置不存在
 */
router.get('/models/:id', validateRequest(validationSchemas.idParam), systemController.getModelConfig);

/**
 * @swagger
 * /api/system/models:
 *   post:
 *     tags: [系统设置]
 *     summary: 新建模型配置
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateModelConfig'
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/models', validateRequest(validationSchemas.createModelConfig), systemController.createModelConfig);

/**
 * @swagger
 * /api/system/models/{id}:
 *   put:
 *     tags: [系统设置]
 *     summary: 更新模型配置
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateModelConfig'
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/models/:id', validateRequest(validationSchemas.updateModelConfig), systemController.updateModelConfig);

/**
 * @swagger
 * /api/system/models/{id}:
 *   delete:
 *     tags: [系统设置]
 *     summary: 删除模型配置
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/models/:id', validateRequest(validationSchemas.idParam), systemController.deleteModelConfig);

/**
 * @swagger
 * /api/system/knowledge-format:
 *   get:
 *     tags: [系统设置]
 *     summary: 获取知识库解析格式
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/knowledge-format', systemController.getKnowledgeFormat);

/**
 * @swagger
 * /api/system/knowledge-format:
 *   post:
 *     tags: [系统设置]
 *     summary: 保存知识库解析格式
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 保存成功
 */
router.post('/knowledge-format', validateRequest(validationSchemas.saveKnowledgeFormat), systemController.saveKnowledgeFormat);

/**
 * @swagger
 * /api/system/question-parse-format:
 *   get:
 *     tags: [系统设置]
 *     summary: 获取题库解析格式
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/question-parse-format', systemController.getQuestionParseFormat);

/**
 * @swagger
 * /api/system/question-parse-format:
 *   post:
 *     tags: [系统设置]
 *     summary: 保存题库解析格式
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 保存成功
 */
router.post('/question-parse-format', validateRequest(validationSchemas.saveQuestionParseFormat), systemController.saveQuestionParseFormat);

export default router;
