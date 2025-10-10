import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { systemService } from '@/services/systemService';
import { ResponseUtil } from '@/utils/response';

class SystemController {
  // 新的供应商配置接口
  listProviderConfigs = asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status ? Number(req.query.status) : undefined;
    const configs = await systemService.listProviderConfigs(status);
    return ResponseUtil.success(res, configs, '获取供应商配置成功');
  });

  getProviderConfig = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const config = await systemService.getProviderConfigById(Number(id));

    if (!config) {
      return ResponseUtil.notFoundError(res, '供应商配置不存在');
    }

    return ResponseUtil.success(res, config, '获取供应商配置成功');
  });

  createProviderConfig = asyncHandler(async (req: Request, res: Response) => {
    const config = await systemService.createProviderConfig(req.body);
    return ResponseUtil.success(res, config, '创建供应商配置成功');
  });

  updateProviderConfig = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await systemService.updateProviderConfig(Number(id), req.body);
    return ResponseUtil.success(res, updated, '更新供应商配置成功');
  });

  deleteProviderConfig = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await systemService.deleteProviderConfig(Number(id));
    return ResponseUtil.success(res, null, '删除供应商配置成功');
  });

  getProviderModels = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const models = await systemService.getProviderModels(Number(id));
    return ResponseUtil.success(res, models, '获取供应商模型列表成功');
  });

  // 旧接口向后兼容（别名）
  listModelConfigs = this.listProviderConfigs;
  getModelConfig = this.getProviderConfig;
  createModelConfig = this.createProviderConfig;
  updateModelConfig = this.updateProviderConfig;
  deleteModelConfig = this.deleteProviderConfig;

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
