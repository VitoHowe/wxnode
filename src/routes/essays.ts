import { Router } from 'express';
import { essayController } from '@/controllers/essayController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

router.use(authenticateToken);

router.get(
  '/subjects/:subjectId/essay-orgs',
  validateRequest(validationSchemas.subjectEssayOrgQuery),
  essayController.listSubjectEssayOrgs
);

router.get(
  '/subjects/:subjectId/chapters/:chapterId/essays',
  validateRequest(validationSchemas.subjectChapterEssayListQuery),
  essayController.listChapterEssays
);

router.get(
  '/subjects/:subjectId/essays',
  validateRequest(validationSchemas.subjectEssayListQuery),
  essayController.listSubjectEssays
);

router.get('/essays/:id', validateRequest(validationSchemas.essayIdParam), essayController.getEssayDetail);

export default router;
