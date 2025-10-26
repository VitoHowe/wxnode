import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import * as parseResultController from '@/controllers/parseResultController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/parse-results
 * @desc 获取所有解析结果列表
 */
router.get('/', parseResultController.getAllParseResults);

/**
 * @route GET /api/parse-results/bank/:bankId/stats
 * @desc 获取题库的解析统计信息
 * @param bankId - 题库ID
 */
router.get('/bank/:bankId/stats', parseResultController.getBankParseStats);

/**
 * @route GET /api/parse-results/bank/:bankId/all
 * @desc 根据题库ID获取所有解析结果
 * @param bankId - 题库ID
 */
router.get('/bank/:bankId/all', parseResultController.getAllParseResultsByBankId);

/**
 * @route GET /api/parse-results/bank/:bankId
 * @desc 根据题库ID获取最新的解析结果
 * @param bankId - 题库ID
 */
router.get('/bank/:bankId', parseResultController.getParseResultByBankId);

/**
 * @route GET /api/parse-results/:id
 * @desc 根据ID获取解析结果（数字ID）
 * @param id - 解析结果ID
 */
router.get('/:id(\\d+)', parseResultController.getParseResultById);

/**
 * @route PUT /api/parse-results/:id
 * @desc 更新解析结果
 * @param id - 解析结果ID
 * @body questions - 题目数组
 */
router.put('/:id(\\d+)', parseResultController.updateParseResult);

/**
 * @route DELETE /api/parse-results/:id
 * @desc 删除解析结果
 * @param id - 解析结果ID
 */
router.delete('/:id(\\d+)', parseResultController.deleteParseResult);

export default router;
