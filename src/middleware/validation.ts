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
  // 统一登录验证(支持微信和普通用户)
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

  // 微信登录验证(保持向后兼容)
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
      refreshToken: Joi.string().optional().messages({
        'string.empty': '刷新令牌不能为空',
      }),
    }).default({}),
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

  // 题库列表查询验证（支持科目筛选）
  questionBankListQuery: {
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
      subjectId: Joi.number().integer().positive().optional().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
      }),
    }),
  },

  // 供应商列表查询验证
  providerListQuery: {
    query: Joi.object({
      status: Joi.number().integer().valid(0, 1).optional().messages({
        'number.base': '状态必须是数字',
        'any.only': '状态仅支持0或1',
      }),
    }),
  },

  // 文件列表查询验证(包含解析状态筛选)
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
  markdownFileListQuery: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      status: Joi.string().valid('pending', 'parsing', 'completed', 'failed').optional(),
    }),
  },

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

  subjectIdParam: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
    }),
  },

  bankIdParam: {
    params: Joi.object({
      bankId: Joi.number().integer().positive().required().messages({
        'number.base': 'bankId 必须是数字',
        'number.integer': 'bankId 必须是整数',
        'number.positive': 'bankId 必须是正数',
        'any.required': 'bankId 是必需的',
      }),
    }),
  },
  bankChapterParam: {
    params: Joi.object({
      bankId: Joi.number().integer().positive().required().messages({
        'number.base': 'bankId 必须是数字',
        'number.integer': 'bankId 必须是整数',
        'number.positive': 'bankId 必须是正数',
        'any.required': 'bankId 是必需的',
      }),
      chapterId: Joi.number().integer().positive().required().messages({
        'number.base': 'chapterId 必须是数字',
        'number.integer': 'chapterId 必须是整数',
        'number.positive': 'chapterId 必须是正数',
        'any.required': 'chapterId 是必需的',
      }),
    }),
  },

  questionBankImageRename: {
    params: Joi.object({
      bankId: Joi.number().integer().positive().required().messages({
        'number.base': 'bankId 必须是数字',
        'number.integer': 'bankId 必须是整数',
        'number.positive': 'bankId 必须是正数',
        'any.required': 'bankId 是必需的',
      }),
      filename: Joi.string().min(1).max(255).required().messages({
        'string.empty': 'filename 不能为空',
        'string.max': 'filename 不能超过255个字符',
        'any.required': 'filename 是必需的',
      }),
    }),
    body: Joi.object({
      newFilename: Joi.string().min(1).max(255).required().messages({
        'string.empty': 'newFilename 不能为空',
        'string.max': 'newFilename 不能超过255个字符',
        'any.required': 'newFilename 是必需的',
      }),
      overwrite: Joi.boolean().optional(),
    }),
  },

  questionBankImageDelete: {
    params: Joi.object({
      bankId: Joi.number().integer().positive().required().messages({
        'number.base': 'bankId 必须是数字',
        'number.integer': 'bankId 必须是整数',
        'number.positive': 'bankId 必须是正数',
        'any.required': 'bankId 是必需的',
      }),
      filename: Joi.string().min(1).max(255).required().messages({
        'string.empty': 'filename 不能为空',
        'string.max': 'filename 不能超过255个字符',
        'any.required': 'filename 是必需的',
      }),
    }),
  },

  subjectCreate: {
    body: Joi.object({
      name: Joi.string().max(100).required().messages({
        'string.empty': '科目名称不能为空',
        'string.max': '科目名称不能超过100个字符',
        'any.required': '科目名称是必需的',
      }),
      code: Joi.string().max(50).allow('', null).optional().messages({
        'string.max': '科目编码不能超过50个字符',
      }),
      status: Joi.number().integer().valid(0, 1).optional().messages({
        'number.base': '状态必须是数字',
        'any.only': '状态仅支持0或1',
      }),
      sort_order: Joi.number().integer().min(0).optional().messages({
        'number.base': '排序必须是数字',
        'number.integer': '排序必须是整数',
        'number.min': '排序不能小于0',
      }),
    }),
  },

  subjectUpdate: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
    }),
    body: Joi.object({
      name: Joi.string().max(100).optional().messages({
        'string.empty': '科目名称不能为空',
        'string.max': '科目名称不能超过100个字符',
      }),
      code: Joi.string().max(50).allow('', null).optional().messages({
        'string.max': '科目编码不能超过50个字符',
      }),
      status: Joi.number().integer().valid(0, 1).optional().messages({
        'number.base': '状态必须是数字',
        'any.only': '状态仅支持0或1',
      }),
      sort_order: Joi.number().integer().min(0).optional().messages({
        'number.base': '排序必须是数字',
        'number.integer': '排序必须是整数',
        'number.min': '排序不能小于0',
      }),
    })
      .min(1)
      .messages({
        'object.min': '至少提供一个需要更新的字段',
      }),
  },

  subjectBanksQuery: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  },

  subjectChapterCreate: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
    }),
    body: Joi.object({
      chapter_name: Joi.string().max(200).required().messages({
        'string.empty': '章节名称不能为空',
        'string.max': '章节名称不能超过200个字符',
        'any.required': '章节名称是必需的',
      }),
      display_name: Joi.string().max(200).allow('', null).optional().messages({
        'string.max': '展示名称不能超过200个字符',
      }),
      chapter_order: Joi.number().integer().min(0).optional().messages({
        'number.base': '章节排序必须是数字',
        'number.integer': '章节排序必须是整数',
        'number.min': '章节排序不能小于0',
      }),
      status: Joi.number().integer().valid(0, 1).optional().messages({
        'number.base': '状态必须是数字',
        'any.only': '状态仅支持0或1',
      }),
    }),
  },

  subjectChapterUpdate: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
      chapterId: Joi.number().integer().positive().required().messages({
        'number.base': 'chapterId 必须是数字',
        'number.integer': 'chapterId 必须是整数',
        'number.positive': 'chapterId 必须是正数',
        'any.required': 'chapterId 是必需的',
      }),
    }),
    body: Joi.object({
      chapter_name: Joi.string().max(200).optional().messages({
        'string.max': '章节名称不能超过200个字符',
      }),
      display_name: Joi.string().max(200).allow('', null).optional().messages({
        'string.max': '展示名称不能超过200个字符',
      }),
      chapter_order: Joi.number().integer().min(0).optional().messages({
        'number.base': '章节排序必须是数字',
        'number.integer': '章节排序必须是整数',
        'number.min': '章节排序不能小于0',
      }),
      status: Joi.number().integer().valid(0, 1).optional().messages({
        'number.base': '状态必须是数字',
        'any.only': '状态仅支持0或1',
      }),
    })
      .min(1)
      .messages({
        'object.min': '至少提供一个需要更新的字段',
      }),
  },

  subjectChapterAliasCreate: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
    }),
    body: Joi.object({
      alias_name: Joi.string().max(200).required().messages({
        'string.empty': '章节别名不能为空',
        'string.max': '章节别名不能超过200个字符',
        'any.required': '章节别名是必需的',
      }),
      subject_chapter_id: Joi.number().integer().positive().required().messages({
        'number.base': 'subject_chapter_id 必须是数字',
        'number.integer': 'subject_chapter_id 必须是整数',
        'number.positive': 'subject_chapter_id 必须是正数',
        'any.required': 'subject_chapter_id 是必需的',
      }),
    }),
  },

  subjectChapterAliasDelete: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
      aliasId: Joi.number().integer().positive().required().messages({
        'number.base': 'aliasId 必须是数字',
        'number.integer': 'aliasId 必须是整数',
        'number.positive': 'aliasId 必须是正数',
        'any.required': 'aliasId 是必需的',
      }),
    }),
  },

  subjectChapterQuestionsQuery: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
      chapterId: Joi.number().integer().positive().required().messages({
        'number.base': 'chapterId 必须是数字',
        'number.integer': 'chapterId 必须是整数',
        'number.positive': 'chapterId 必须是正数',
        'any.required': 'chapterId 是必需的',
      }),
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(0).max(100).default(0),
      questionNumber: Joi.number().integer().min(1).optional(),
    }),
  },

  subjectChapterProgress: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
      chapterId: Joi.number().integer().positive().required().messages({
        'number.base': 'chapterId 必须是数字',
        'number.integer': 'chapterId 必须是整数',
        'number.positive': 'chapterId 必须是正数',
        'any.required': 'chapterId 是必需的',
      }),
    }),
    body: Joi.object({
      current_question_number: Joi.number().integer().min(1).required().messages({
        'number.base': 'current_question_number 必须是数字',
        'number.integer': 'current_question_number 必须是整数',
        'number.min': 'current_question_number 不能小于 1',
        'any.required': 'current_question_number 是必需的',
      }),
      completed_count: Joi.number().integer().min(0).optional().messages({
        'number.base': 'completed_count 必须是数字',
        'number.integer': 'completed_count 必须是整数',
        'number.min': 'completed_count 不能小于 0',
      }),
      total_questions: Joi.number().integer().min(0).required().messages({
        'number.base': 'total_questions 必须是数字',
        'number.integer': 'total_questions 必须是整数',
        'number.min': 'total_questions 不能小于 0',
        'any.required': 'total_questions 是必需的',
      }),
    }),
  },

  subjectRandomQuery: {
    params: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
    }),
    query: Joi.object({
      count: Joi.number().integer().min(1).max(50).default(10),
    }),
  },

  adminQuestionBankListQuery: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      subjectId: Joi.number().integer().positive().optional(),
    }),
  },

  adminQuestionBankImport: {
    body: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
      name: Joi.string().max(200).allow('', null).optional(),
      description: Joi.string().max(500).allow('', null).optional(),
    }),
  },

  adminQuestionBankChapterImport: {
    params: Joi.object({
      bankId: Joi.number().integer().positive().required().messages({
        'number.base': 'bankId 必须是数字',
        'number.integer': 'bankId 必须是整数',
        'number.positive': 'bankId 必须是正数',
        'any.required': 'bankId 是必需的',
      }),
    }),
    body: Joi.object({
      subjectChapterId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectChapterId 必须是数字',
        'number.integer': 'subjectChapterId 必须是整数',
        'number.positive': 'subjectChapterId 必须是正数',
        'any.required': 'subjectChapterId 是必需的',
      }),
    }),
  },

  realExamListQuery: {
    query: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  },

  realExamPaperParam: {
    params: Joi.object({
      paperId: Joi.number().integer().positive().required().messages({
        'number.base': 'paperId 必须是数字',
        'number.integer': 'paperId 必须是整数',
        'number.positive': 'paperId 必须是正数',
        'any.required': 'paperId 是必需的',
      }),
    }),
  },

  realExamQuestionsQuery: {
    params: Joi.object({
      paperId: Joi.number().integer().positive().required().messages({
        'number.base': 'paperId 必须是数字',
        'number.integer': 'paperId 必须是整数',
        'number.positive': 'paperId 必须是正数',
        'any.required': 'paperId 是必需的',
      }),
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(0).max(100).default(0),
      questionNumber: Joi.number().integer().min(1).optional(),
    }),
  },

  realExamAttemptCreate: {
    params: Joi.object({
      paperId: Joi.number().integer().positive().required().messages({
        'number.base': 'paperId 必须是数字',
        'number.integer': 'paperId 必须是整数',
        'number.positive': 'paperId 必须是正数',
        'any.required': 'paperId 是必需的',
      }),
    }),
    body: Joi.object({
      total_questions: Joi.number().integer().min(0).required(),
      correct_count: Joi.number().integer().min(0).required(),
      wrong_count: Joi.number().integer().min(0).required(),
      accuracy: Joi.number().min(0).max(100).optional(),
      wrong_questions: Joi.array()
        .items(
          Joi.object({
            question_id: Joi.number().integer().positive().required(),
            selected_answer: Joi.string().allow('', null).optional(),
            correct_answer: Joi.string().allow('', null).optional(),
          })
        )
        .optional(),
    }),
  },

  practiceSummaryQuery: {
    query: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
      mode: Joi.string().valid('real', 'mock', 'special', 'random').optional(),
    }),
  },

  practiceWrongListQuery: {
    query: Joi.object({
      subjectId: Joi.number().integer().positive().required().messages({
        'number.base': 'subjectId 必须是数字',
        'number.integer': 'subjectId 必须是整数',
        'number.positive': 'subjectId 必须是正数',
        'any.required': 'subjectId 是必需的',
      }),
      mode: Joi.string().valid('real', 'mock', 'special', 'random').optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  },

  practiceAttemptCreate: {
    body: Joi.object({
      subject_id: Joi.number().integer().positive().required(),
      mode: Joi.string().valid('real', 'mock', 'special', 'random').required(),
      source_type: Joi.string().valid('paper', 'bank', 'chapter', 'subject_chapter', 'subject').required(),
      source_id: Joi.number().integer().positive().required(),
      total_questions: Joi.number().integer().min(0).required(),
      correct_count: Joi.number().integer().min(0).required(),
      wrong_count: Joi.number().integer().min(0).required(),
      accuracy: Joi.number().min(0).max(100).optional(),
      question_source: Joi.string().valid('real_exam', 'question_bank').required(),
      question_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
      wrong_questions: Joi.array()
        .items(
          Joi.object({
            question_id: Joi.number().integer().positive().required(),
            selected_answer: Joi.string().allow('', null).optional(),
            correct_answer: Joi.string().allow('', null).optional(),
          })
        )
        .optional(),
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
      fileType: Joi.string().valid('question_bank', 'knowledge_base').default('question_bank').messages({
        'any.only': '文件类型仅支持 question_bank 或 knowledge_base',
      }),
      type: Joi.string().optional(), // 允许uniapp发送的type字段
    }).unknown(true), // 允许其他未知字段
  },

  // 文件解析验证
  markdownFileUpload: {
    body: Joi.object({
      name: Joi.string().max(200).required(),
      description: Joi.string().max(500).allow('', null).optional(),
    }).unknown(true),
  },

  markdownFileParse: {
    params: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
  },

  parseFile: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'number.integer': 'ID必须是整数',
        'number.positive': 'ID必须是正数',
        'any.required': 'ID是必需的',
      }),
    }),
    body: Joi.object({
      providerId: Joi.number().integer().positive().required().messages({
        'number.base': '供应商ID必须是数字',
        'number.integer': '供应商ID必须是整数',
        'number.positive': '供应商ID必须是正数',
        'any.required': '供应商ID是必需的',
      }),
      modelName: Joi.string().max(100).required().messages({
        'string.empty': '模型名称不能为空',
        'string.max': '模型名称长度不能超过100个字符',
        'any.required': '模型名称是必需的',
      }),
    }),
  },

  // 新建供应商配置
  createProviderConfig: {
    body: Joi.object({
      type: Joi.string().valid('openai', 'gemini', 'qwen', 'custom').required().messages({
        'any.only': '供应商类型仅支持 openai, gemini, qwen, custom',
        'any.required': '供应商类型是必需的',
      }),
      name: Joi.string().max(100).required().messages({
        'string.empty': '供应商名称不能为空',
        'string.max': '供应商名称长度不能超过100个字符',
        'any.required': '供应商名称是必需的',
      }),
      endpoint: Joi.string().uri({ allowRelative: false }).max(255).required().messages({
        'string.empty': '供应商地址不能为空',
        'string.uri': '供应商地址必须为有效的URL',
        'string.max': '供应商地址长度不能超过255个字符',
        'any.required': '供应商地址是必需的',
      }),
      api_key: Joi.string().max(255).required().messages({
        'string.empty': 'API密钥不能为空',
        'string.max': 'API密钥长度不能超过255个字符',
        'any.required': 'API密钥是必需的',
      }),
      provider_config: Joi.object().optional().messages({
        'object.base': '供应商配置必须是对象类型',
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

  // 旧接口向后兼容
  createModelConfig: {
    body: Joi.object({
      type: Joi.string().valid('openai', 'gemini', 'qwen', 'custom').optional().default('custom'),
      name: Joi.string().max(100).required().messages({
        'string.empty': '供应商名称不能为空',
        'string.max': '供应商名称长度不能超过100个字符',
        'any.required': '供应商名称是必需的',
      }),
      endpoint: Joi.string().uri({ allowRelative: false }).max(255).required().messages({
        'string.empty': '供应商地址不能为空',
        'string.uri': '供应商地址必须为有效的URL',
        'string.max': '供应商地址长度不能超过255个字符',
        'any.required': '供应商地址是必需的',
      }),
      api_key: Joi.string().max(255).required().messages({
        'string.empty': 'API密钥不能为空',
        'string.max': 'API密钥长度不能超过255个字符',
        'any.required': 'API密钥是必需的',
      }),
      provider_config: Joi.object().optional(),
      description: Joi.string().allow('', null).max(500).optional().messages({
        'string.max': '描述长度不能超过500个字符',
      }),
      status: Joi.number().integer().valid(0, 1).optional().messages({
        'number.base': '状态必须是数字',
        'any.only': '状态仅支持0或1',
      }),
    }),
  },

  // 更新供应商配置
  updateProviderConfig: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必需的',
      }),
    }),
    body: Joi.object({
      type: Joi.string().valid('openai', 'gemini', 'qwen', 'custom').optional().messages({
        'any.only': '供应商类型仅支持 openai, gemini, qwen, custom',
      }),
      name: Joi.string().max(100).optional().messages({
        'string.empty': '供应商名称不能为空',
        'string.max': '供应商名称长度不能超过100个字符',
      }),
      endpoint: Joi.string().uri({ allowRelative: false }).max(255).optional().messages({
        'string.uri': '供应商地址必须为有效的URL',
        'string.max': '供应商地址长度不能超过255个字符',
      }),
      api_key: Joi.string().max(255).optional().messages({
        'string.max': 'API密钥长度不能超过255个字符',
      }),
      provider_config: Joi.object().optional().messages({
        'object.base': '供应商配置必须是对象类型',
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

  // 旧接口向后兼容
  updateModelConfig: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必需的',
      }),
    }),
    body: Joi.object({
      type: Joi.string().valid('openai', 'gemini', 'qwen', 'custom').optional(),
      name: Joi.string().max(100).optional().messages({
        'string.empty': '供应商名称不能为空',
        'string.max': '供应商名称长度不能超过100个字符',
      }),
      endpoint: Joi.string().uri({ allowRelative: false }).max(255).optional().messages({
        'string.uri': '供应商地址必须为有效的URL',
        'string.max': '供应商地址长度不能超过255个字符',
      }),
      api_key: Joi.string().max(255).optional().messages({
        'string.max': 'API密钥长度不能超过255个字符',
      }),
      provider_config: Joi.object().optional(),
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

  // 设置用户角色验证(仅超级管理员)
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


  // 单词书上传
  wordBookUpload: {
    body: Joi.object({
      name: Joi.string().max(200).optional().messages({
        'string.max': '单词书名称长度不能超过200个字符',
      }),
      description: Joi.string().max(500).allow('', null).optional().messages({
        'string.max': '描述长度不能超过500个字符',
      }),
      language: Joi.string().max(20).optional().messages({
        'string.max': '语言标识长度不能超过20个字符',
      }),
    }),
  },

  // 单词书列表查询
  wordBookList: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      keyword: Joi.string().max(200).optional(),
      language: Joi.string().max(20).optional(),
    }),
  },

  // 单词条目查询
  wordBookEntriesQuery: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必填项',
      }),
    }),
    query: Joi.object().optional(),
  },


  // 单词操作通用校验
  wordBookEntryAction: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必填项',
      }),
    }),
    body: Joi.object({
      entryId: Joi.number().integer().positive().required().messages({
        'number.base': 'entryId 必须是数字',
        'any.required': 'entryId 是必填项',
      }),
    }),
  },

  // 单词书进度写入
  wordBookProgressUpsert: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必填项',
      }),
    }),
    body: Joi.object({
      completedCount: Joi.number().integer().min(0).optional(),
      currentIndex: Joi.number().integer().min(0).optional(),
      currentEntryId: Joi.number().integer().positive().allow(null).optional(),
      totalWords: Joi.number().integer().min(0).optional(),
      notes: Joi.string().max(255).allow('', null).optional(),
    })
      .min(1)
      .messages({
        'object.min': '请至少提供一个需要更新的字段',
      }),
  },

  // 单词书全局ID校验
  wordBookIdParams: {
    params: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'any.required': 'ID是必填项',
      }),
    }),
  },

  // ???????????
  wordPracticeBookParam: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required().messages({
        'number.base': 'bookId?????',
        'number.integer': 'bookId?????',
        'number.positive': 'bookId?????',
        'any.required': 'bookId????',
      }),
    }),
  },

  // ???????????????
  wordPracticeWordsQuery: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required().messages({
        'number.base': 'bookId?????',
        'number.integer': 'bookId?????',
        'number.positive': 'bookId?????',
        'any.required': 'bookId????',
      }),
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'page?????',
        'number.integer': 'page?????',
        'number.min': 'page????0',
      }),
      limit: Joi.number().integer().min(1).max(200).default(50).messages({
        'number.base': 'limit?????',
        'number.integer': 'limit?????',
        'number.min': 'limit????0',
        'number.max': 'limit????200',
      }),
    }),
  },

  // ?????????
  wordPracticeUpdateProgress: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required().messages({
        'number.base': 'bookId?????',
        'number.integer': 'bookId?????',
        'number.positive': 'bookId?????',
        'any.required': 'bookId????',
      }),
    }),
    body: Joi.object({
      word_entry_id: Joi.number().integer().positive().required().messages({
        'number.base': 'word_entry_id?????',
        'number.integer': 'word_entry_id?????',
        'number.positive': 'word_entry_id?????',
        'any.required': 'word_entry_id????',
      }),
      status: Joi.string().valid('pending', 'review', 'mastered').optional().messages({
        'any.only': 'status???pending, review, mastered',
      }),
      is_favorite: Joi.boolean().optional().messages({
        'boolean.base': 'is_favorite??????',
      }),
      wrong_delta: Joi.number().integer().optional().messages({
        'number.base': 'wrong_delta?????',
        'number.integer': 'wrong_delta?????',
      }),
    }),
  },

  // ?????????
  wordPracticeSaveState: {
    params: Joi.object({
      bookId: Joi.number().integer().positive().required().messages({
        'number.base': 'bookId?????',
        'number.integer': 'bookId?????',
        'number.positive': 'bookId?????',
        'any.required': 'bookId????',
      }),
    }),
    body: Joi.object({
      last_word_entry_id: Joi.number().integer().positive().allow(null).optional().messages({
        'number.base': 'last_word_entry_id?????',
        'number.integer': 'last_word_entry_id?????',
        'number.positive': 'last_word_entry_id?????',
      }),
      last_word_order_index: Joi.number().integer().min(0).allow(null).optional().messages({
        'number.base': 'last_word_order_index?????',
        'number.integer': 'last_word_order_index?????',
        'number.min': 'last_word_order_index????0',
      }),
    })
      .min(1)
      .messages({
        'object.min': '??????????????',
      }),
  },

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
