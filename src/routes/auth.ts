import { Router } from 'express';
import { authController } from '@/controllers/authController';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { authenticateRefreshToken, authenticateToken } from '@/middleware/auth';

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
router.post('/login', validateRequest(validationSchemas.login), authController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [认证]
 *     summary: 普通用户注册
 *     description: 注册新的普通用户账户
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名（3-50字符，只能包含字母、数字、下划线）
 *                 minLength: 3
 *                 maxLength: 50
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *               password:
 *                 type: string
 *                 description: 密码（6-20字符，必须包含大小写字母和数字）
 *                 minLength: 6
 *                 maxLength: 20
 *               nickname:
 *                 type: string
 *                 description: 昵称（可选，最大50字符）
 *                 maxLength: 50
 *               phone:
 *                 type: string
 *                 description: 手机号（可选）
 *                 pattern: '^1[3-9]\d{9}$'
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "注册成功"
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
 *       409:
 *         description: 用户名已存在
 */
router.post('/register', validateRequest(validationSchemas.register), authController.register);

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
router.get('/profile', authenticateToken, authController.getProfile);

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
router.put('/profile', authenticateToken, validateRequest(validationSchemas.updateProfile), authController.updateProfile);

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
