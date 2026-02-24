import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { adminEssayController } from '@/controllers/adminEssayController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

const tempUploadDir = path.join(process.cwd(), 'public', 'question-banks', 'essays', 'tmp');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ext === '.md' ? ext : '.md';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
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
  '/essay-orgs',
  validateRequest(validationSchemas.essayOrgListQuery),
  adminEssayController.listEssayOrgs
);
router.post(
  '/essay-orgs',
  validateRequest(validationSchemas.essayOrgCreate),
  adminEssayController.createEssayOrg
);
router.put(
  '/essay-orgs/:orgId',
  validateRequest(validationSchemas.essayOrgUpdate),
  adminEssayController.updateEssayOrg
);
router.delete(
  '/essay-orgs/:orgId',
  validateRequest(validationSchemas.essayOrgIdParam),
  adminEssayController.deleteEssayOrg
);

router.get('/essays', validateRequest(validationSchemas.adminEssayListQuery), adminEssayController.listEssays);
router.post(
  '/essays',
  upload.single('file'),
  validateRequest(validationSchemas.adminEssayCreate),
  adminEssayController.createEssay
);
router.put(
  '/essays/:id',
  upload.single('file'),
  validateRequest(validationSchemas.adminEssayUpdate),
  adminEssayController.updateEssay
);
router.delete('/essays/:id', validateRequest(validationSchemas.essayIdParam), adminEssayController.deleteEssay);

export default router;
