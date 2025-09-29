import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@/utils/logger';

const DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

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
  // 统一登录验证（支持微信和普通用户）
  login: {
    body: Joi.object({
      // 微信登录参数
      code: Joi.string().optional(),
      encryptedData: Joi.string().optional(),
      iv: Joi.string().optional(),
      signature: Joi.string().optional(),
      
      // 普通用户登录参数
      username: Joi.string().min(3).max(50).optional(),
      password: Joi.string().min(6).max(20).optional(),
    }).custom((value, helpers) => {
      const isWechatLogin = !!value.code;
      const isNormalLogin = !!(value.username && value.password);
      
      if (!isWechatLogin && !isNormalLogin) {
        return helpers.error('any.invalid', {
          message: '请提供微信登录参数(code)或普通登录参数(username, password)'
        });
      }
      
      if (isWechatLogin && isNormalLogin) {
        return helpers.error('any.invalid', {
          message: '不能同时使用两种登录方式'
        });
      }
      
      return value;
    }).messages({
      'any.invalid': '{#message}'
    }),
  },

  // 微信登录验证（保持向后兼容）
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

  // 普通用户登录验证
  normalLogin: {
    body: Joi.object({
      username: Joi.string().min(3).max(50).required().messages({
        'string.empty': '用户名不能为空',
        'string.min': '用户名长度至少3个字符',
        'string.max': '用户名长度不能超过50个字符',
        'any.required': '用户名是必需的',
      }),
      password: Joi.string().min(6).max(20).required().messages({
        'string.empty': '密码不能为空',
        'string.min': '密码长度至少6位',
        'string.max': '密码长度不能超过20位',
        'any.required': '密码是必需的',
      }),
    }),
  },

  // 用户注册验证
  register: {
    body: Joi.object({
      username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/).required().messages({
        'string.empty': '用户名不能为空',
        'string.min': '用户名长度至少3个字符',
        'string.max': '用户名长度不能超过50个字符',
        'string.pattern.base': '用户名只能包含字母、数字和下划线',
        'any.required': '用户名是必需的',
      }),
      password: Joi.string().min(6).max(20).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,20}$/).required().messages({
        'string.min': '密码长度至少6位',
        'string.max': '密码长度不能超过20位',
        'string.pattern.base': '密码必须包含大小写字母和数字',
        'any.required': '密码是必需的',
      }),
      nickname: Joi.string().max(50).optional().messages({
        'string.max': '昵称长度不能超过50个字符',
      }),
      phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional().messages({
        'string.pattern.base': '手机号格式不正确',
      }),
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

  // 文件列表查询验证（包含解析状态筛选）
  fileListQuery: {
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
      status: Joi.string().valid('pending', 'parsing', 'completed', 'failed').optional().messages({
        'any.only': 'status 仅支持 pending, parsing, completed, failed',
      }),
      startTime: Joi.string().pattern(DATE_TIME_REGEX).optional().messages({
        'string.pattern.base': 'startTime 时间格式需为 YYYY-MM-DD HH:mm:ss',
      }),
      endTime: Joi.string().pattern(DATE_TIME_REGEX).optional().messages({
        'string.pattern.base': 'endTime 时间格式需为 YYYY-MM-DD HH:mm:ss',
      }),
    }).custom((value, helpers) => {
      const { startTime, endTime } = value;

      if (startTime && endTime) {
        const start = new Date(startTime.replace(' ', 'T'));
        const end = new Date(endTime.replace(' ', 'T'));

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return helpers.error('any.invalid', { message: '时间格式无效' });
        }

        if (start > end) {
          return helpers.error('any.invalid', { message: 'startTime 不能晚于 endTime' });
        }
      }

      return value;
    }).messages({
      'any.invalid': '{#message}',
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
      type: Joi.string().optional(), // 允许uniapp发送的type字段
    }).unknown(true), // 允许其他未知字段
  },

  // 新建模型配置
  createModelConfig: {
    body: Joi.object({
      name: Joi.string().max(100).required().messages({
        'string.empty': '模型名称不能为空',
        'string.max': '模型名称长度不能超过100个字符',
        'any.required': '模型名称是必需的',
      }),
      endpoint: Joi.string().uri({ allowRelative: false }).max(255).required().messages({
        'string.empty': '模型地址不能为空',
        'string.uri': '模型地址必须为有效的URL',
        'string.max': '模型地址长度不能超过255个字符',
        'any.required': '模型地址是必需的',
      }),
      api_key: Joi.string().max(255).required().messages({
        'string.empty': '模型密钥不能为空',
        'string.max': '模型密钥长度不能超过255个字符',
        'any.required': '模型密钥是必需的',
      }),
      description: Joi.string().allow('', null).max(500).optional().messages({
        'string.max': '描述长度不能超过500个字符',
      }),
      status: Joi.number().integer().valid(0, 1).optional().messages({
        'number.base': '状态必须是数字',
        'any.only': '状态仅支持0或1',
      }),
    }),
  },

  // 更新模型配置
  updateModelConfig: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必需的',
      }),
    }),
    body: Joi.object({
      name: Joi.string().max(100).optional().messages({
        'string.empty': '模型名称不能为空',
        'string.max': '模型名称长度不能超过100个字符',
      }),
      endpoint: Joi.string().uri({ allowRelative: false }).max(255).optional().messages({
        'string.uri': '模型地址必须为有效的URL',
        'string.max': '模型地址长度不能超过255个字符',
      }),
      api_key: Joi.string().max(255).optional().messages({
        'string.max': '模型密钥长度不能超过255个字符',
      }),
      description: Joi.string().allow('', null).max(500).optional().messages({
        'string.max': '描述长度不能超过500个字符',
      }),
      status: Joi.number().integer().valid(0, 1).optional().messages({
        'number.base': '状态必须是数字',
        'any.only': '状态仅支持0或1',
      }),
    }).min(1).messages({
      'object.min': '至少提供一个需要更新的字段',
    }),
  },

  // 保存知识库解析格式
  saveKnowledgeFormat: {
    body: Joi.object().unknown(true),
  },

  // 保存题库解析格式
  saveQuestionParseFormat: {
    body: Joi.object().unknown(true),
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

  // 设置用户角色验证（仅超级管理员）
  setUserRole: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必需的',
      }),
    }),
    body: Joi.object({
      role: Joi.string().valid('user', 'admin', 'super_admin').required().messages({
        'any.only': 'role 仅支持 user, admin, super_admin',
        'any.required': 'role 是必需的',
      }),
    }),
  },

  // 更新文件解析状态
  updateFileParseStatus: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必需的',
      }),
    }),
    body: Joi.object({
      status: Joi.string().valid('pending', 'parsing', 'completed', 'failed').required().messages({
        'any.only': 'status 仅支持 pending, parsing, completed, failed',
        'any.required': 'status 是必需的',
      }),
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
