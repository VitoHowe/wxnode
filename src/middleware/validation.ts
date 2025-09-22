import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@/utils/logger';

// 验证结果接口
interface ValidationResult {
  error?: Joi.ValidationError;
  value: any;
}

/**
 * 请求验证中间件工厂
 */
export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // 验证请求体
    if (schema.body) {
      const result: ValidationResult = schema.body.validate(req.body);
      if (result.error) {
        errors.push(`请求体验证失败: ${result.error.details.map(d => d.message).join(', ')}`);
      } else {
        req.body = result.value;
      }
    }

    // 验证查询参数
    if (schema.query) {
      const result: ValidationResult = schema.query.validate(req.query);
      if (result.error) {
        errors.push(`查询参数验证失败: ${result.error.details.map(d => d.message).join(', ')}`);
      } else {
        req.query = result.value;
      }
    }

    // 验证路径参数
    if (schema.params) {
      const result: ValidationResult = schema.params.validate(req.params);
      if (result.error) {
        errors.push(`路径参数验证失败: ${result.error.details.map(d => d.message).join(', ')}`);
      } else {
        req.params = result.value;
      }
    }

    if (errors.length > 0) {
      logger.warn('请求验证失败:', errors);
      res.status(400).json({
        code: 400,
        message: '请求参数验证失败',
        errors,
        data: null,
      });
      return;
    }

    next();
  };
};

// 常用验证模式
export const validationSchemas = {
  // 微信登录验证
  wechatLogin: {
    body: Joi.object({
      code: Joi.string().required().messages({
        'string.empty': '微信登录code不能为空',
        'any.required': '微信登录code是必需的',
      }),
      encryptedData: Joi.string().optional(),
      iv: Joi.string().optional(),
      signature: Joi.string().optional(),
    }),
  },

  // 刷新令牌验证
  refreshToken: {
    body: Joi.object({
      refreshToken: Joi.string().required().messages({
        'string.empty': '刷新令牌不能为空',
        'any.required': '刷新令牌是必需的',
      }),
    }),
  },

  // 用户信息更新验证
  updateProfile: {
    body: Joi.object({
      nickname: Joi.string().max(50).optional().messages({
        'string.max': '昵称长度不能超过50个字符',
      }),
      avatar_url: Joi.string().uri().optional().messages({
        'string.uri': '头像URL格式不正确',
      }),
      phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional().messages({
        'string.pattern.base': '手机号格式不正确',
      }),
    }),
  },

  // 分页查询验证
  pagination: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1).messages({
        'number.base': '页码必须是数字',
        'number.integer': '页码必须是整数',
        'number.min': '页码必须大于0',
      }),
      limit: Joi.number().integer().min(1).max(100).default(20).messages({
        'number.base': '每页数量必须是数字',
        'number.integer': '每页数量必须是整数',
        'number.min': '每页数量必须大于0',
        'number.max': '每页数量不能超过100',
      }),
    }),
  },

  // ID参数验证
  idParam: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'number.integer': 'ID必须是整数',
        'number.positive': 'ID必须是正数',
        'any.required': 'ID是必需的',
      }),
    }),
  },

  // 文件上传验证
  fileUpload: {
    body: Joi.object({
      name: Joi.string().max(200).required().messages({
        'string.empty': '文件名不能为空',
        'string.max': '文件名长度不能超过200个字符',
        'any.required': '文件名是必需的',
      }),
      description: Joi.string().max(500).optional().messages({
        'string.max': '文件描述长度不能超过500个字符',
      }),
    }),
  },

  // 题库查询验证
  questionQuery: {
    query: Joi.object({
      bank_id: Joi.number().integer().positive().optional(),
      type: Joi.string().valid('single', 'multiple', 'judge', 'fill', 'essay').optional(),
      difficulty: Joi.number().integer().min(1).max(3).optional(),
      keyword: Joi.string().max(100).optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
};

/**
 * 自定义验证器
 */
export const customValidators = {
  /**
   * 验证微信openid格式
   */
  wechatOpenId: Joi.string().pattern(/^[a-zA-Z0-9_-]{28}$/).messages({
    'string.pattern.base': '微信openid格式不正确',
  }),

  /**
   * 验证手机号格式
   */
  phoneNumber: Joi.string().pattern(/^1[3-9]\d{9}$/).messages({
    'string.pattern.base': '手机号格式不正确',
  }),

  /**
   * 验证密码强度
   */
  password: Joi.string().min(6).max(20).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,20}$/).messages({
    'string.min': '密码长度至少6位',
    'string.max': '密码长度不能超过20位',
    'string.pattern.base': '密码必须包含大小写字母和数字',
  }),
};
