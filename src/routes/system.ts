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
 *   description: AI供应商配置与解析模板管理
 */

/**
 * @swagger
 * /api/system/providers:
 *   get:
 *     tags: [系统设置]
 *     summary: 获取AI供应商配置列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: 筛选状态（0:停用 1:启用），不传则返回全部
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/providers', validateRequest(validationSchemas.providerListQuery), systemController.listProviderConfigs);

// 向后兼容旧接口
router.get('/models', validateRequest(validationSchemas.providerListQuery), systemController.listModelConfigs);

/**
 * @swagger
 * /api/system/providers/{id}:
 *   get:
 *     tags: [系统设置]
 *     summary: 获取AI供应商配置详情
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
 *         description: 供应商配置不存在
 */
router.get('/providers/:id', validateRequest(validationSchemas.idParam), systemController.getProviderConfig);
// 向后兼容旧接口
router.get('/models/:id', validateRequest(validationSchemas.idParam), systemController.getModelConfig);

/**
 * @swagger
 * /api/system/providers/{id}/models:
 *   get:
 *     tags: [系统设置]
 *     summary: 获取供应商可用模型列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 供应商配置ID
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
 *                   example: 获取供应商模型列表成功
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       404:
 *         description: 供应商配置不存在
 *       500:
 *         description: 获取模型列表失败
 */
router.get('/providers/:id/models', validateRequest(validationSchemas.idParam), systemController.getProviderModels);

/**
 * @swagger
 * /api/system/providers:
 *   post:
 *     tags: [系统设置]
 *     summary: 新建AI供应商配置
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProviderConfig'
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/providers', validateRequest(validationSchemas.createProviderConfig), systemController.createProviderConfig);

// 向后兼容旧接口
router.post('/models', validateRequest(validationSchemas.createModelConfig), systemController.createModelConfig);

/**
 * @swagger
 * /api/system/providers/{id}:
 *   put:
 *     tags: [系统设置]
 *     summary: 更新AI供应商配置
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
 *             $ref: '#/components/schemas/UpdateProviderConfig'
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/providers/:id', validateRequest(validationSchemas.updateProviderConfig), systemController.updateProviderConfig);

// 向后兼容旧接口
router.put('/models/:id', validateRequest(validationSchemas.updateModelConfig), systemController.updateModelConfig);

/**
 * @swagger
 * /api/system/providers/{id}:
 *   delete:
 *     tags: [系统设置]
 *     summary: 删除AI供应商配置
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
router.delete('/providers/:id', validateRequest(validationSchemas.idParam), systemController.deleteProviderConfig);

// 向后兼容旧接口
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
