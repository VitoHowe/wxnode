import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { wordBookController } from '@/controllers/wordBookController';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const basePath = process.env.WORD_BOOK_UPLOAD_PATH || path.join(process.cwd(), 'uploads', 'word-books');
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
    cb(null, basePath);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const uniqueName = `${timestamp}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.json')) {
      cb(null, true);
      return;
    }
    cb(new Error('仅支持 JSON 格式的单词书文件'));
  },
});

router.use(authenticateToken);

/**
 * @swagger
 * /api/word-books/upload:
 *   post:
 *     tags: [单词书管理]
 *     summary: 上传单词书 JSON 文件
 *     description: 通过上传 JSON 文件将整本单词书写入数据库，服务器会自动解析条目并建立索引。
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
 *                 description: 包含单词数组的 JSON 文件
 *               name:
 *                 type: string
 *                 description: 单词书名称（可选，不填则使用文件名）
 *               description:
 *                 type: string
 *                 description: 单词书简介
 *               language:
 *                 type: string
 *                 description: 语言标识，默认 zh-CN
 *     responses:
 *       200:
 *         description: 上传成功
 *       400:
 *         description: 参数或文件格式错误
 *       401:
 *         description: 未登录
 */
router.post(
  '/upload',
  upload.single('file'),
  validateRequest(validationSchemas.wordBookUpload),
  wordBookController.uploadWordBook
);

/**
 * @swagger
 * /api/word-books:
 *   get:
 *     tags: [单词书管理]
 *     summary: 获取单词书列表
 *     description: 返回当前系统内所有可用的单词书，用于选择练习素材。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *           description: 按名称/描述模糊搜索
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           description: 按语言过滤
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
 *     tags: [单词书管理]
 *     summary: 获取指定单词书的单词
 *     description: 根据单词书 ID 返回其中的单词条目，支持分页或一次性取全量数据（all=1）。
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
 *       401:
 *         description: 未登录
 *       404:
 *         description: 单词书不存在
 */
router.get(
  '/:id/words',
  validateRequest(validationSchemas.wordBookEntriesQuery),
  wordBookController.getWordBookWords
);

export default router;
