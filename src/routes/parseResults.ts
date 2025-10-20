import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import * as parseResultController from '@/controllers/parseResultController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/parse-results
 * @desc 获取解析结果列表
 * @query bank_id - 题库ID（可选）
 * @query page - 页码（默认1）
 * @query limit - 每页数量（默认20）
 */
router.get('/', parseResultController.getParseResults);

/**
 * @route GET /api/parse-results/:id
 * @desc 根据ID获取解析结果
 * @param id - 解析结果ID
 */
router.get('/:id', parseResultController.getParseResultById);

/**
 * @route GET /api/parse-results/bank/:bankId
 * @desc 根据题库ID获取所有解析结果
 * @param bankId - 题库ID
 */
router.get('/bank/:bankId', parseResultController.getParseResultsByBankId);

/**
 * @route GET /api/parse-results/bank/:bankId/stats
 * @desc 获取题库的解析统计信息
 * @param bankId - 题库ID
 */
router.get('/bank/:bankId/stats', parseResultController.getBankParseStats);

/**
 * @route DELETE /api/parse-results/:id
 * @desc 删除解析结果
 * @param id - 解析结果ID
 */
router.delete('/:id', parseResultController.deleteParseResult);

export default router;
