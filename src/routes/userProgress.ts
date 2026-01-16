import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import * as userProgressController from '@/controllers/userProgressController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

router.get('/:bankId/chapters', userProgressController.getBankChaptersProgress);
router.get('/:bankId/full', userProgressController.getFullBankProgress);
router.post('/:bankId/chapters/:chapterId', userProgressController.saveChapterProgress);
router.delete('/:bankId/chapters/:chapterId', userProgressController.deleteChapterProgress);
router.delete('/:bankId', userProgressController.resetProgress);

export default router;
