import { Request, Response, NextFunction } from 'express';
import { userProgressService } from '@/services/userProgressService';
import { ResponseUtil } from '@/utils/response';
import { logger } from '@/utils/logger';

/**
 * 获取用户在指定题库的学习进度
 */
export async function getUserProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const { bankId } = req.params;
    const userId = req.user?.userId; // 从JWT中获取用户ID
    
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    
    const progress = await userProgressService.getUserProgress(userId, Number(bankId));
    
    if (!progress) {
      return ResponseUtil.success(res, null, '暂无学习进度');
    }
    
    return ResponseUtil.success(res, progress, '获取学习进度成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 获取用户所有学习进度
 */
export async function getAllUserProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    
    const progressList = await userProgressService.getAllUserProgress(userId);
    
    return ResponseUtil.success(res, progressList, '获取所有学习进度成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 保存/更新学习进度
 */
export async function saveProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const { bankId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    
    const { 
      parse_result_id,
      current_question_index,
      completed_count,
      total_questions 
    } = req.body;
    
    // 验证必填参数
    if (current_question_index === undefined || total_questions === undefined) {
      return ResponseUtil.validationError(
        res, 
        'current_question_index 和 total_questions 是必填参数'
      );
    }

    if (typeof current_question_index !== 'number' || typeof total_questions !== 'number') {
      return ResponseUtil.validationError(res, '参数类型错误');
    }

    if (current_question_index < 0 || total_questions < 0) {
      return ResponseUtil.validationError(res, '参数值不能为负数');
    }
    
    const progress = await userProgressService.saveProgress(userId, Number(bankId), {
      parse_result_id,
      current_question_index,
      completed_count,
      total_questions
    });
    
    return ResponseUtil.success(res, progress, '保存学习进度成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 重置题库学习进度
 */
export async function resetProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const { bankId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    
    await userProgressService.resetProgress(userId, Number(bankId));
    
    return ResponseUtil.success(res, null, '重置学习进度成功');
  } catch (error) {
    return next(error);
  }
}

/**
 * 获取最近学习的题库
 */
export async function getRecentStudyBanks(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return ResponseUtil.authError(res, '用户未登录');
    }
    
    const { limit = 5 } = req.query;
    
    const recentBanks = await userProgressService.getRecentStudyBanks(
      userId, 
      Number(limit)
    );
    
    return ResponseUtil.success(res, recentBanks, '获取最近学习题库成功');
  } catch (error) {
    return next(error);
  }
}

