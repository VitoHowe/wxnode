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
  filename: (_req, file, cb) => {
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
  fileFilter: (_req, file, cb) => {
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

export default router;
