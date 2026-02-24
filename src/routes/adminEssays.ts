import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { adminEssayController } from '@/controllers/adminEssayController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { getEssayTempUploadDir } from '@/utils/essayStorage';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      cb(null, getEssayTempUploadDir());
    } catch (error) {
      cb(error as Error, '');
    }
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

router.get(
  '/essay-permission-users',
  validateRequest(validationSchemas.adminEssayPermissionUserListQuery),
  adminEssayController.listEssayPermissionUsers
);
router.get(
  '/essay-permissions',
  validateRequest(validationSchemas.adminEssayPermissionQuery),
  adminEssayController.getSubjectEssayPermission
);
router.put(
  '/essay-permissions',
  validateRequest(validationSchemas.adminEssayPermissionSave),
  adminEssayController.saveSubjectEssayPermission
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
