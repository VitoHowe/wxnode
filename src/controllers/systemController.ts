import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { systemService } from '@/services/systemService';
import { ResponseUtil } from '@/utils/response';

class SystemController {
  listModelConfigs = asyncHandler(async (req: Request, res: Response) => {
    const configs = await systemService.listModelConfigs();
    return ResponseUtil.success(res, configs, '获取模型配置成功');
  });

  getModelConfig = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const config = await systemService.getModelConfigById(Number(id));

    if (!config) {
      return ResponseUtil.notFoundError(res, '模型配置不存在');
    }

    return ResponseUtil.success(res, config, '获取模型配置成功');
  });

  createModelConfig = asyncHandler(async (req: Request, res: Response) => {
    const config = await systemService.createModelConfig(req.body);
    return ResponseUtil.success(res, config, '创建模型配置成功');
  });

  updateModelConfig = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await systemService.updateModelConfig(Number(id), req.body);
    return ResponseUtil.success(res, updated, '更新模型配置成功');
  });

  deleteModelConfig = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await systemService.deleteModelConfig(Number(id));
    return ResponseUtil.success(res, null, '删除模型配置成功');
  });

  getKnowledgeFormat = asyncHandler(async (req: Request, res: Response) => {
    const setting = await systemService.getSetting('knowledge_format');
    return ResponseUtil.success(res, setting, '获取知识库解析格式成功');
  });

  saveKnowledgeFormat = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId ?? null;
    const saved = await systemService.saveSetting('knowledge_format', req.body, userId);
    return ResponseUtil.success(res, saved, '保存知识库解析格式成功');
  });

  getQuestionParseFormat = asyncHandler(async (req: Request, res: Response) => {
    const setting = await systemService.getSetting('question_parse_format');
    return ResponseUtil.success(res, setting, '获取题库解析格式成功');
  });

  saveQuestionParseFormat = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId ?? null;
    const saved = await systemService.saveSetting('question_parse_format', req.body, userId);
    return ResponseUtil.success(res, saved, '保存题库解析格式成功');
  });
}

export const systemController = new SystemController();
