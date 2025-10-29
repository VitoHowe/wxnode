import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import * as userProgressController from '@/controllers/userProgressController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/user-progress
 * @desc 获取用户所有学习进度
 */
router.get('/', userProgressController.getAllUserProgress);

/**
 * @route GET /api/user-progress/recent
 * @desc 获取最近学习的题库
 * @query limit - 返回数量（默认5）
 */
router.get('/recent', userProgressController.getRecentStudyBanks);

/**
 * @route GET /api/user-progress/:bankId
 * @desc 获取用户在指定题库的学习进度
 * @param bankId - 题库ID
 */
router.get('/:bankId', userProgressController.getUserProgress);

/**
 * @route POST /api/user-progress/:bankId
 * @desc 保存/更新学习进度
 * @param bankId - 题库ID
 * @body parse_result_id - 解析结果ID（可选）
 * @body current_question_index - 当前题目索引（必填）
 * @body completed_count - 已完成题目数（可选）
 * @body total_questions - 总题目数（必填）
 */
router.post('/:bankId', userProgressController.saveProgress);

/**
 * @route DELETE /api/user-progress/:bankId
 * @desc 重置题库学习进度
 * @param bankId - 题库ID
 */
router.delete('/:bankId', userProgressController.resetProgress);

/**
 * @route GET /api/user-progress/:bankId/chapters
 * @desc 获取题库所有章节的学习进度
 * @param bankId - 题库ID
 */
router.get('/:bankId/chapters', userProgressController.getBankChaptersProgress);

/**
 * @route GET /api/user-progress/:bankId/chapters/:chapterId
 * @desc 获取用户在指定章节的学习进度
 * @param bankId - 题库ID
 * @param chapterId - 章节ID
 */
router.get('/:bankId/chapters/:chapterId', userProgressController.getChapterProgress);

/**
 * @route POST /api/user-progress/:bankId/chapters/:chapterId
 * @desc 保存/更新章节学习进度
 * @param bankId - 题库ID
 * @param chapterId - 章节ID
 * @body current_question_number - 当前题号（必填）
 * @body completed_count - 已完成题目数（可选）
 * @body total_questions - 总题目数（必填）
 */
router.post('/:bankId/chapters/:chapterId', userProgressController.saveChapterProgress);

export default router;

