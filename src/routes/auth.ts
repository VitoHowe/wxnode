import { Router } from 'express';
import { authController } from '@/controllers/authController';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { authenticateRefreshToken } from '@/middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [认证]
 *     summary: 微信小程序登录
 *     description: 使用微信小程序code进行登录认证
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: 微信小程序wx.login获取的code
 *               encryptedData:
 *                 type: string
 *                 description: 加密的用户信息（可选）
 *               iv:
 *                 type: string
 *                 description: 初始向量（可选）
 *               signature:
 *                 type: string
 *                 description: 数据签名（可选）
 *     responses:
 *       200:
 *         description: 登录成功
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
 *                   example: "登录成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *                     user:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 认证失败
 */
router.post('/login', validateRequest(validationSchemas.wechatLogin), authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [认证]
 *     summary: 刷新访问令牌
 *     description: 使用刷新令牌获取新的访问令牌
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌
 *     responses:
 *       200:
 *         description: 刷新成功
 *       401:
 *         description: 刷新令牌无效
 */
router.post('/refresh', validateRequest(validationSchemas.refreshToken), authenticateRefreshToken, authController.refresh);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [认证]
 *     summary: 获取用户信息
 *     description: 获取当前登录用户的详细信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 */
router.get('/profile', authController.getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [认证]
 *     summary: 更新用户信息
 *     description: 更新当前登录用户的信息
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 description: 昵称
 *               avatar_url:
 *                 type: string
 *                 description: 头像URL
 *               phone:
 *                 type: string
 *                 description: 手机号
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未登录
 */
router.put('/profile', validateRequest(validationSchemas.updateProfile), authController.updateProfile);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [认证]
 *     summary: 用户登出
 *     description: 登出当前用户，使令牌失效
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未登录
 */
router.post('/logout', authController.logout);

export default router;
