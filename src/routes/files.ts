import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileController } from '@/controllers/fileController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
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
    // 只允许PDF文件
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只支持PDF文件上传'));
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
 *     description: 上传PDF格式的题库文件
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
 *                 description: PDF文件
 *               name:
 *                 type: string
 *                 description: 题库名称
 *               description:
 *                 type: string
 *                 description: 题库描述
 *     responses:
 *       200:
 *         description: 上传成功
 *       400:
 *         description: 文件格式不支持
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
router.get('/', validateRequest(validationSchemas.pagination), fileController.getFiles);

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
 *     summary: 解析文件
 *     description: 启动文件解析任务
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
 *         description: 解析任务已启动
 *       401:
 *         description: 未登录
 *       404:
 *         description: 文件不存在
 */
router.post('/:id/parse', validateRequest(validationSchemas.idParam), fileController.parseFile);

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
