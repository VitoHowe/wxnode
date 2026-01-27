import { Router } from 'express';
import { subjectController } from '@/controllers/subjectController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

// 所有科目路由需要认证
router.use(authenticateToken);

router.get('/admin', requireAdmin, subjectController.listAllSubjects);
router.get('/', subjectController.listSubjects);
router.get('/:subjectId', validateRequest(validationSchemas.subjectIdParam), subjectController.getSubjectById);

router.post(
  '/',
  requireAdmin,
  validateRequest(validationSchemas.subjectCreate),
  subjectController.createSubject
);

router.put(
  '/:subjectId',
  requireAdmin,
  validateRequest(validationSchemas.subjectUpdate),
  subjectController.updateSubject
);

router.get(
  '/:subjectId/banks',
  validateRequest(validationSchemas.subjectBanksQuery),
  subjectController.getSubjectBanks
);

router.get(
  '/:subjectId/chapters',
  validateRequest(validationSchemas.subjectIdParam),
  subjectController.listSubjectChapters
);

router.get(
  '/:subjectId/chapter-aliases',
  requireAdmin,
  validateRequest(validationSchemas.subjectIdParam),
  subjectController.listSubjectChapterAliases
);

router.post(
  '/:subjectId/chapters',
  requireAdmin,
  validateRequest(validationSchemas.subjectChapterCreate),
  subjectController.createSubjectChapter
);

router.post(
  '/:subjectId/chapter-aliases',
  requireAdmin,
  validateRequest(validationSchemas.subjectChapterAliasCreate),
  subjectController.createSubjectChapterAlias
);

router.post(
  '/:subjectId/chapters/sync',
  requireAdmin,
  validateRequest(validationSchemas.subjectIdParam),
  subjectController.syncSubjectChapters
);

router.put(
  '/:subjectId/chapters/:chapterId',
  requireAdmin,
  validateRequest(validationSchemas.subjectChapterUpdate),
  subjectController.updateSubjectChapter
);

router.delete(
  '/:subjectId/chapter-aliases/:aliasId',
  requireAdmin,
  validateRequest(validationSchemas.subjectChapterAliasDelete),
  subjectController.deleteSubjectChapterAlias
);

router.get(
  '/:subjectId/chapters/:chapterId/questions',
  validateRequest(validationSchemas.subjectChapterQuestionsQuery),
  subjectController.getSubjectChapterQuestions
);

router.get(
  '/:subjectId/chapters/progress',
  validateRequest(validationSchemas.subjectIdParam),
  subjectController.getSubjectChaptersProgress
);

router.post(
  '/:subjectId/chapters/:chapterId/progress',
  validateRequest(validationSchemas.subjectChapterProgress),
  subjectController.saveSubjectChapterProgress
);

router.get(
  '/:subjectId/random',
  validateRequest(validationSchemas.subjectRandomQuery),
  subjectController.getSubjectRandomQuestions
);

export default router;
