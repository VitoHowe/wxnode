import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { wordPracticeController } from '@/controllers/wordPracticeController';

const router = Router();

router.use(authenticateToken);

router.get(
  '/books/:bookId/words',
  validateRequest(validationSchemas.wordPracticeWordsQuery),
  wordPracticeController.getWordsWithProgress
);

router.get(
  '/books/:bookId/progress',
  validateRequest(validationSchemas.wordPracticeBookParam),
  wordPracticeController.getBookProgress
);

router.post(
  '/books/:bookId/progress',
  validateRequest(validationSchemas.wordPracticeUpdateProgress),
  wordPracticeController.updateWordProgress
);

router.get(
  '/books/:bookId/state',
  validateRequest(validationSchemas.wordPracticeBookParam),
  wordPracticeController.getBookState
);

router.post(
  '/books/:bookId/state',
  validateRequest(validationSchemas.wordPracticeSaveState),
  wordPracticeController.saveBookState
);

export default router;
