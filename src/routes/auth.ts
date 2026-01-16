import { Router } from 'express';
import { authController } from '@/controllers/authController';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { authenticateRefreshToken, authenticateToken } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimit';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [认证]
 *     summary: 用户登录（支持微信和普通用户）
 *     description: 支持微信小程序登录和普通用户登录两种方式
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: 微信登录
 *                 required:
 *                   - code
 *                 properties:
 *                   code:
 *                     type: string
 *                     description: 微信小程序wx.login获取的code
 *                   encryptedData:
 *                     type: string
 *                     description: 加密的用户信息（可选）
 *                   iv:
 *                     type: string
 *                     description: 初始向量（可选）
 *                   signature:
 *                     type: string
 *                     description: 数据签名（可选）
 *               - type: object
 *                 title: 普通用户登录
 *                 required:
 *                   - username
 *                   - password
 *                 properties:
 *                   username:
 *                     type: string
 *                     description: 用户名
 *                     minLength: 3
 *                     maxLength: 50
 *                   password:
 *                     type: string
 *                     description: 密码
 *                     minLength: 6
 *                     maxLength: 20
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
router.post('/login', authRateLimiter, validateRequest(validationSchemas.login), authController.login);


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
router.post(
  '/refresh',
  authRateLimiter,
  validateRequest(validationSchemas.refreshToken),
  authenticateRefreshToken,
  authController.refresh
);

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
router.get('/profile', authenticateToken, authController.getProfile);


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
router.post('/logout', authenticateToken, authController.logout);

export default router;
