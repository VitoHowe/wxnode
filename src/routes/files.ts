import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileController } from '@/controllers/fileController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    
    // 确保上传目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // 支持的文件类型
    const allowedMimeTypes = [
      'application/pdf',                    // PDF
      'application/msword',                 // DOC
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'text/plain',                         // TXT
      'text/markdown',                      // MD
      'application/vnd.ms-excel',           // XLS
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'text/csv',                           // CSV
      'application/json',                   // JSON
    ];
    
    // 支持的文件扩展名（作为备用检查）
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.xlsx', '.xls', '.csv', '.json'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，支持格式：PDF, DOC, DOCX, TXT, MD, XLSX, XLS, CSV, JSON'));
    }
  }
});

// 所有文件路由都需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     tags: [文件管理]
 *     summary: 上传题库文件
 *     description: 上传题库文件，支持多种格式：PDF, DOC, DOCX, TXT, MD, XLSX, XLS, CSV, JSON
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - name
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 题库文件（支持PDF, DOC, DOCX, TXT, MD, XLSX, XLS, CSV, JSON）
 *               name:
 *                 type: string
 *                 description: 题库名称
 *               description:
 *                 type: string
 *                 description: 题库描述
 *               type:
 *                 type: string
 *                 description: 文件类型（可选，uniapp会自动发送）
 *     responses:
 *       200:
 *         description: 上传成功
 *       400:
 *         description: 文件格式不支持或参数验证失败
 *       401:
 *         description: 未登录
 */
router.post('/upload', upload.single('file'), validateRequest(validationSchemas.fileUpload), fileController.uploadFile);

/**
 * @swagger
 * /api/files:
 *   get:
 *     tags: [文件管理]
 *     summary: 获取文件列表
 *     description: 获取用户上传的文件列表
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, parsing, completed, failed]
 *         description: 解析状态筛选
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 */
router.get('/', validateRequest(validationSchemas.fileListQuery), fileController.getFiles);

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     tags: [文件管理]
 *     summary: 获取文件详情
 *     description: 获取指定文件的详细信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文件ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 文件不存在
 */
router.get('/:id', validateRequest(validationSchemas.idParam), fileController.getFileById);

/**
 * @swagger
 * /api/files/{id}/parse:
 *   post:
 *     tags: [文件管理]
 *     summary: 使用AI解析文件
 *     description: 使用指定的AI供应商和模型解析题库文件
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文件ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - modelName
 *             properties:
 *               providerId:
 *                 type: integer
 *                 description: AI供应商ID
 *                 example: 1
 *               modelName:
 *                 type: string
 *                 description: 模型名称
 *                 example: "gpt-4-turbo"
 *     responses:
 *       200:
 *         description: AI解析任务已启动
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
 *                   example: "AI解析任务已启动"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     taskId:
 *                       type: string
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未登录
 *       404:
 *         description: 文件或供应商不存在
 */
router.post('/:id/parse', validateRequest(validationSchemas.parseFile), fileController.parseFile);

/**
 * @swagger
 * /api/files/{id}/parse-status:
 *   patch:
 *     tags: [文件管理]
 *     summary: 更新解析状态
 *     description: 手动更新文件解析状态（文件上传者、管理员或超级管理员）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文件ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, parsing, completed, failed]
 *                 description: 解析状态
 *     responses:
 *       200:
 *         description: 状态更新成功
 *       401:
 *         description: 未登录
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 文件不存在
 */
router.patch(
  '/:id/parse-status',
  validateRequest(validationSchemas.updateFileParseStatus),
  fileController.updateParseStatus
);

/**
 * @swagger
 * /api/files/{id}/parse-status:
 *   get:
 *     tags: [文件管理]
 *     summary: 获取解析状态
 *     description: 获取文件解析的当前状态和进度
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文件ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 文件不存在
 */
router.get('/:id/parse-status', validateRequest(validationSchemas.idParam), fileController.getParseStatus);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     tags: [文件管理]
 *     summary: 删除文件
 *     description: 删除指定的文件及其相关数据
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文件ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       401:
 *         description: 未登录
 *       404:
 *         description: 文件不存在
 */
router.delete('/:id', validateRequest(validationSchemas.idParam), fileController.deleteFile);

export default router;
