import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { adminQuestionBankController } from '@/controllers/adminQuestionBankController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { FileTypeMapper } from '@/utils/fileTypeMapper';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const relativePath = FileTypeMapper.getStoragePath('question_bank', file.mimetype, file.originalname);
    const baseUploadPath = process.env.UPLOAD_PATH || './uploadFile';
    const fullUploadPath = path.join(baseUploadPath, relativePath);

    if (!fs.existsSync(fullUploadPath)) {
      fs.mkdirSync(fullUploadPath, { recursive: true });
    }

    cb(null, fullUploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueFilename = FileTypeMapper.generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const isJson = file.mimetype === 'application/json' || path.extname(file.originalname).toLowerCase() === '.json';
    if (isJson) {
      cb(null, true);
    } else {
      cb(new Error('只支持JSON格式文件'));
    }
  },
});

router.use(authenticateToken, requireAdmin);

router.get(
  '/',
  validateRequest(validationSchemas.adminQuestionBankListQuery),
  adminQuestionBankController.listQuestionBanks
);

router.get(
  '/:bankId/subject-chapters',
  validateRequest(validationSchemas.bankIdParam),
  adminQuestionBankController.getBankSubjectChapters
);

router.post(
  '/import-json',
  upload.single('file'),
  validateRequest(validationSchemas.adminQuestionBankImport),
  adminQuestionBankController.importBankJson
);

router.post(
  '/:bankId/chapters/import-json',
  upload.single('file'),
  validateRequest(validationSchemas.adminQuestionBankChapterImport),
  adminQuestionBankController.importChapterJson
);

export default router;
