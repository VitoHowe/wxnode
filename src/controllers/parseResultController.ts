import { Request, Response, NextFunction } from 'express';
import { parseResultService } from '@/services/parseResultService';
import { ResponseUtil } from '@/utils/response';
import { logger } from '@/utils/logger';

/**
 * 获取所有解析结果列表
 */
export async function getAllParseResults(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await parseResultService.getAllParseResults();
    return ResponseUtil.success(res, results, '获取解析结果列表成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 根据ID获取解析结果
 */
export async function getParseResultById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await parseResultService.getParseResultById(Number(id));
    
    if (!result) {
      return ResponseUtil.notFoundError(res, '解析结果不存在');
    }
    
    return ResponseUtil.success(res, result, '获取解析结果成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 根据题库ID获取最新的解析结果
 */
export async function getParseResultByBankId(req: Request, res: Response, next: NextFunction) {
  try {
    const { bankId } = req.params;
    const result = await parseResultService.getParseResultByBankId(Number(bankId));
    
    if (!result) {
      return ResponseUtil.notFoundError(res, '该题库暂无解析结果');
    }
    
    return ResponseUtil.success(res, result, '获取题库解析结果成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 根据题库ID获取所有解析结果
 */
export async function getAllParseResultsByBankId(req: Request, res: Response, next: NextFunction) {
  try {
    const { bankId } = req.params;
    const results = await parseResultService.getAllParseResultsByBankId(Number(bankId));
    
    return ResponseUtil.success(res, results, '获取题库所有解析结果成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 更新解析结果
 */
export async function updateParseResult(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return ResponseUtil.validationError(res, 'questions 必须是数组');
    }
    
    const result = await parseResultService.updateParseResult(Number(id), questions);
    
    return ResponseUtil.success(res, result, '更新解析结果成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 删除解析结果
 */
export async function deleteParseResult(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await parseResultService.deleteParseResult(Number(id));
    
    return ResponseUtil.success(res, null, '删除解析结果成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 获取题库的解析统计信息
 */
export async function getBankParseStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { bankId } = req.params;
    const stats = await parseResultService.getBankParseStats(Number(bankId));
    
    return ResponseUtil.success(res, stats, '获取题库解析统计成功');
  } catch (error) {
    return next(error);
  }
}
