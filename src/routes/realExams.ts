import { Router } from 'express';
import { realExamController } from '@/controllers/realExamController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';

const router = Router();

router.use(authenticateToken);

router.get('/', validateRequest(validationSchemas.realExamListQuery), realExamController.listPapers);
router.get(
  '/:paperId/questions',
  validateRequest(validationSchemas.realExamQuestionsQuery),
  realExamController.getPaperQuestions
);
router.post(
  '/:paperId/attempts',
  validateRequest(validationSchemas.realExamAttemptCreate),
  realExamController.submitAttempt
);
router.get(
  '/:paperId/wrong-questions',
  validateRequest(validationSchemas.realExamPaperParam),
  realExamController.getWrongQuestions
);

export default router;
