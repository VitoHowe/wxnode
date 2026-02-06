import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { practiceController } from '@/controllers/practiceController';

const router = Router();

router.use(authenticateToken);

router.get('/summary', validateRequest(validationSchemas.practiceSummaryQuery), practiceController.getSummary);
router.post('/attempts', validateRequest(validationSchemas.practiceAttemptCreate), practiceController.createAttempt);
router.get('/wrong-questions', validateRequest(validationSchemas.practiceWrongListQuery), practiceController.listWrongQuestions);
router.delete('/wrong-questions/:id', validateRequest(validationSchemas.idParam), practiceController.deleteWrongQuestion);

export default router;
