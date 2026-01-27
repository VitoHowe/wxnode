import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { markdownFileController } from '@/controllers/markdownFileController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

const tempUploadDir = path.join(process.cwd(), 'public', 'markdown-docs', 'tmp');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext || '.md'}`;
    cb(null, baseName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isMarkdown = ext === '.md' || file.mimetype === 'text/markdown' || file.mimetype === 'text/plain';
    if (isMarkdown) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 Markdown 文件（.md）'));
    }
  },
});

router.use(authenticateToken, requireAdmin);

router.get(
  '/',
  validateRequest(validationSchemas.markdownFileListQuery),
  markdownFileController.listFiles
);

router.post(
  '/',
  upload.single('file'),
  validateRequest(validationSchemas.markdownFileUpload),
  markdownFileController.uploadFile
);

router.get(
  '/:id',
  validateRequest(validationSchemas.idParam),
  markdownFileController.getFileById
);

router.post(
  '/:id/parse',
  validateRequest(validationSchemas.markdownFileParse),
  markdownFileController.parseFile
);

router.get(
  '/:id/chapters',
  validateRequest(validationSchemas.idParam),
  markdownFileController.listChapters
);

router.delete(
  '/:id',
  validateRequest(validationSchemas.idParam),
  markdownFileController.deleteFile
);

export default router;
