import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileController } from '@/controllers/fileController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { FileTypeMapper, BusinessType } from '@/utils/fileTypeMapper';

const router = Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 获取业务类型，默认为 question_bank
    const businessType: BusinessType = (req.body.fileType as BusinessType) || 'question_bank';
    
    // 获取文件分类路径
    const relativePath = FileTypeMapper.getStoragePath(businessType, file.mimetype, file.originalname);
    
    // 基础上传路径
    const baseUploadPath = process.env.UPLOAD_PATH || './uploadFile';
    
    // 完整上传路径
    const fullUploadPath = path.join(baseUploadPath, relativePath);
    
    // 确保上传目录存在（递归创建）
    if (!fs.existsSync(fullUploadPath)) {
      fs.mkdirSync(fullUploadPath, { recursive: true });
    }
    
    cb(null, fullUploadPath);
  },
  filename: (req, file, cb) => {
    // 使用工具类生成唯一文件名
    const uniqueFilename = FileTypeMapper.generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
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
      'image/jpeg',                         // JPEG
      'image/jpg',                          // JPG
      'image/png',                          // PNG
      'image/gif',                          // GIF
      'image/bmp',                          // BMP
      'image/webp',                         // WEBP
    ];
    
    // 支持的文件扩展名（作为备用检查）
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.xlsx', '.xls', '.csv', '.json', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，支持格式：PDF, DOC, DOCX, TXT, MD, XLSX, XLS, CSV, JSON, JPG, PNG, GIF, BMP, WEBP'));
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
 *     description: 上传题库文件，支持多种格式：PDF, DOC, DOCX, TXT, MD, XLSX, XLS, CSV, JSON, JPG, PNG, GIF, BMP, WEBP
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
 *                 description: 题库文件（支持PDF, DOC, DOCX, TXT, MD, XLSX, XLS, CSV, JSON, JPG, PNG, GIF, BMP, WEBP）
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

/**
 * @swagger
 * /api/files/upload-json:
 *   post:
 *     tags: [文件管理]
 *     summary: 上传JSON文件并直接导入题库
 *     description: 上传已解析完成的JSON文件，系统会根据文件名创建题库，并按章节拆分存储题目
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
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JSON文件（必须包含questions数组）
 *     responses:
 *       200:
 *         description: 导入成功
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
 *                   example: "JSON文件导入成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 10
 *                     name:
 *                       type: string
 *                       example: "gemin"
 *                     description:
 *                       type: string
 *                       example: "从JSON文件导入，共1000题"
 *                     parse_status:
 *                       type: string
 *                       example: "completed"
 *                     total_questions:
 *                       type: integer
 *                       example: 1000
 *       400:
 *         description: 文件格式错误或JSON格式不正确
 *       401:
 *         description: 未登录
 */
router.post('/upload-json', upload.single('file'), fileController.uploadJsonFile);

export default router;
