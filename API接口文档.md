# 微信小程序题库管理系统 API 接口文档

**版本**: v1.5.0  
**最后更新**: 2025-10-26  
**基础URL**: `http://localhost:3001/api`

## 📋 更新日志

### v1.5.0 (2025-10-26)
- ✅ **解析结果管理模块**: 新增解析结果的完整CRUD接口
- ✅ **路由优化**: 修复解析结果路由冲突问题，优化路由匹配顺序
- ✅ **历史追溯**: 支持查看题库的所有历史解析记录
- ✅ **统计分析**: 新增题库解析统计接口
- ✅ **数据结构优化**: 解析结果以JSON格式存储，便于扩展
- ✅ **文档完善**: 新增详细的解析结果API文档

### v1.4.0 (2025-10-10)
- ✅ **重构AI供应商架构**: 将模型配置重构为AI供应商配置，支持OpenAI/Gemini/Qwen等多种供应商
- ✅ **表结构优化**: `model_configs` 表迁移至 `ai_providers` 表，新增 `type` 和 `provider_config` 字段
- ✅ **新增供应商类型**: 支持 openai、gemini、qwen、custom 四种类型
- ✅ **AI文件解析**: 文件解析接口集成AI供应商，支持自动识别和提取题目
- ✅ **题库表扩展**: 新增 `provider_id` 和 `model_name` 字段，记录解析使用的AI信息
- ✅ **向后兼容**: 保留旧 `/api/system/models` 接口，与新接口并存
- ✅ **数据迁移**: 自动迁移旧表数据，保留备份

### v1.3.0 (2025-09-29)
- ✅ **新增系统设置模块**: 提供模型配置CRUD接口与知识库/题库解析格式管理
- ✅ **数据库扩展**: 新增 `model_configs`、`system_settings` 两张表
- ✅ **权限控制强化**: 系统设置接口仅限管理员及以上角色访问
- ✅ **文档更新**: 补充系统设置API说明与样例

### v1.2.0 (2025-09-28)
- ✅ **重大升级**: 实现统一响应格式，所有接口现在都返回一致的数据结构
- ✅ **完善日志系统**: 新增详细的API响应日志，便于调试和监控
- ✅ **修复关键问题**: 解决了登录和Profile接口数据返回问题
- ✅ **代码优化**: 移除废弃代码，提高代码质量和维护性
- ✅ **文档更新**: 完善API文档，更新配置指南

### v1.1.0 (2025-09-27)
- ✅ **新增普通用户注册登录系统**: 支持用户名密码方式注册和登录
- ✅ **统一登录接口**: 一个接口同时支持微信登录和普通用户登录
- ✅ **数据库架构优化**: 支持混合用户类型（微信用户 + 普通用户）

## 🎯 特色功能

1. **微信小程序无缝集成**: 支持wx.login()一键登录
2. **普通用户注册登录系统**: 传统用户名密码认证
3. **混合用户系统**: 同时支持微信用户和普通用户
4. **JWT无状态认证**: 支持access token和refresh token
5. **统一响应格式**: 所有接口返回标准化数据结构
6. **完善的权限控制**: 基于角色的访问控制
7. **AI文件解析**: 支持使用OpenAI/Gemini/Qwen等AI模型智能解析题库文件
8. **详细日志记录**: 便于开发调试和生产监控
9. **多供应商管理**: 支持OpenAI/Gemini/Qwen等多种AI供应商配置与解析模板集中维护

## ⚚️ 系统设置模块

### AI供应商配置

- **数据库表**: `ai_providers`
  - `type` 供应商类型（openai/gemini/qwen/custom）
  - `name` 供应商实例名称
  - `endpoint` API端点地址
  - `api_key` API密钥
  - `provider_config` 供应商特定配置（JSON，可空）
  - `description` 描述信息（可空）
  - `status` 是否启用（1:启用 0:停用）
  - **唯一约束**: `(type, name)` 组合唯一

#### GET /api/system/providers
- **功能**：获取AI供应商配置列表
- **权限**：需要 Bearer Token；管理员或超级管理员
- **查询参数**：
  - `status` （可选）：筛选状态
    - `0` - 仅返回已停用的供应商
    - `1` - 仅返回已启用的供应商
    - 不传 - 返回全部供应商（默认）
- **请求示例**：
  - 获取全部：`GET /api/system/providers`
  - 仅启用的：`GET /api/system/providers?status=1`
  - 仅停用的：`GET /api/system/providers?status=0`
- **响应示例**：
```json
{
  "code": 200,
  "message": "获取供应商配置成功",
  "data": [
    {
      "id": 1,
      "type": "openai",
      "name": "OpenAI-Production",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "api_key": "sk-********",
      "provider_config": {
        "model": "gpt-4-turbo",
        "temperature": 0.7,
        "max_tokens": 2000
      },
      "description": "OpenAI GPT-4 Turbo 生产环境",
      "status": 1,
      "created_at": "2025-10-10 12:00:00",
      "updated_at": "2025-10-10 12:00:00"
    },
    {
      "id": 2,
      "type": "qwen",
      "name": "Qwen-Testing",
      "endpoint": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      "api_key": "sk-********",
      "provider_config": {
        "model": "qwen-turbo"
      },
      "description": "通义千问测试环境",
      "status": 1,
      "created_at": "2025-10-10 13:00:00",
      "updated_at": "2025-10-10 13:00:00"
    }
  ],
  "timestamp": "2025-10-10T09:10:00.123Z"
}
```

#### POST /api/system/providers
- **功能**：新增AI供应商配置
- **权限**：需要 Bearer Token；管理员或超级管理员
- **请求体**：
```json
{
  "type": "openai",
  "name": "OpenAI-Production",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "api_key": "sk-********",
  "provider_config": {
    "model": "gpt-4-turbo",
    "temperature": 0.7
  },
  "description": "OpenAI生产环境",
  "status": 1
}
```
- **字段说明**：
  - `type` （必填）：供应商类型，可选值：`openai` | `gemini` | `qwen` | `custom`
  - `name` （必填）：供应商实例名称，用于区分同类型不同配置
  - `provider_config` （可选）：JSON对象，存储供应商特定参数
- **响应**：返回创建后的完整供应商配置

#### PUT /api/system/providers/{id}
- **功能**：更新AI供应商配置
- **权限**：需要 Bearer Token；管理员或超级管理员
- **说明**：请求体至少包含一个可更新字段；所有字段均可选

#### DELETE /api/system/providers/{id}
- **功能**：删除AI供应商配置
- **权限**：需要 Bearer Token；管理员或超级管理员

#### GET /api/system/providers/{id}/models
- **功能**：获取指定供应商的可用模型列表
- **权限**：需要 Bearer Token；管理员或超级管理员
- **说明**：
  - 根据供应商类型自动调用对应API获取模型列表
  - OpenAI：调用 OpenAI Models API
  - Gemini：调用 Google Generative Language API
  - Qwen：返回预定义的通义千问模型列表
  - Custom：不支持自动获取，返回错误提示
- **响应示例（OpenAI）**：
```json
{
  "code": 200,
  "message": "获取供应商模型列表成功",
  "data": [
    {
      "id": "gpt-4-turbo-preview",
      "name": "gpt-4-turbo-preview",
      "description": "Created: 2024-01-25T12:00:00.000Z",
      "owned_by": "openai"
    },
    {
      "id": "gpt-4",
      "name": "gpt-4",
      "description": "Created: 2023-06-27T12:00:00.000Z",
      "owned_by": "openai"
    },
    {
      "id": "gpt-3.5-turbo",
      "name": "gpt-3.5-turbo",
      "description": "Created: 2023-02-28T12:00:00.000Z",
      "owned_by": "openai"
    }
  ],
  "timestamp": "2025-10-10T14:30:00.123Z"
}
```
- **响应示例（Qwen）**：
```json
{
  "code": 200,
  "message": "获取供应商模型列表成功",
  "data": [
    {
      "id": "qwen-turbo",
      "name": "Qwen Turbo",
      "description": "通义千问超大规模语言模型，支持中文英文等不同语言输入"
    },
    {
      "id": "qwen-plus",
      "name": "Qwen Plus",
      "description": "通义千问增强版，性能更强"
    },
    {
      "id": "qwen-max",
      "name": "Qwen Max",
      "description": "通义千问最强版本"
    }
  ],
  "timestamp": "2025-10-10T14:30:00.123Z"
}
```
- **错误响应（供应商已停用）**：
```json
{
  "code": 500,
  "message": "供应商已停用，无法获取模型列表",
  "data": null,
  "timestamp": "2025-10-10T14:30:00.123Z"
}
```
- **错误响应（自定义供应商）**：
```json
{
  "code": 500,
  "message": "自定义供应商不支持自动获取模型列表，请手动配置模型信息",
  "data": null,
  "timestamp": "2025-10-10T14:30:00.123Z"
}
```

#### 向后兼容：旧接口
为保证向后兼容，以下旧接口仍可使用，功能与新接口一致：
- `GET /api/system/models` → 同 `GET /api/system/providers`
- `GET /api/system/models/{id}` → 同 `GET /api/system/providers/{id}`
- `POST /api/system/models` → 同 `POST /api/system/providers`（`type`字段可选，默认`custom`）
- `PUT /api/system/models/{id}` → 同 `PUT /api/system/providers/{id}`
- `DELETE /api/system/models/{id}` → 同 `DELETE /api/system/providers/{id}`

### 知识库与题库解析格式

- **数据库表**: `system_settings`
  - `type`：固定值 `knowledge_format` 或 `question_parse_format`
  - `payload`：JSON 格式的解析模板
  - `updated_by`：最近操作人ID（可空）

#### GET /api/system/knowledge-format
- **功能**：获取知识库解析格式配置
- **权限**：需要 Bearer Token；管理员或超级管理员
- **响应示例**：
```json
{
  "code": 200,
  "message": "获取知识库解析格式成功",
  "data": {
    "type": "knowledge_format",
    "payload": {
      "titleField": "标题",
      "contentField": "内容"
    },
    "updated_by": 2,
    "updated_at": "2025-09-29 10:30:12"
  },
  "timestamp": "2025-09-29T09:15:00.123Z"
}
```

#### POST /api/system/knowledge-format
- **功能**：保存知识库解析格式（请求体为任意JSON结构）
- **权限**：需要 Bearer Token；管理员或超级管理员

#### GET /api/system/question-parse-format
- **功能**：获取题库解析格式配置
- **权限**：需要 Bearer Token；管理员或超级管理员

#### POST /api/system/question-parse-format
- **功能**：保存题库解析格式（请求体为任意JSON结构）
- **权限**：需要 Bearer Token；管理员或超级管理员

## 📦 文件管理模块

### POST /api/files (文件上传)
- **功能**：上传题库或知识库文件
- **权限**：需要 Bearer Token
- **Content-Type**：multipart/form-data
- **请求参数**：
  - `file` （必填）：文件对象
  - `name` （必填）：文件名称
  - `description` （可选）：文件描述
  - `fileType` （可选）：文件类型
    - `question_bank` - 题库文件（默认）
    - `knowledge_base` - 知识库文件
- **响应示例**：
```json
{
  "code": 200,
  "message": "文件上传成功",
  "data": {
    "id": 1,
    "name": "2025年数学题库",
    "description": "高中数学题库",
    "file_type": "question_bank",
    "file_original_name": "math_questions.txt",
    "file_path": "/uploads/xxx.txt",
    "file_size": 102400,
    "parse_status": "pending",
    "created_by": 1,
    "created_at": "2025-10-10 16:00:00",
    "updated_at": "2025-10-10 16:00:00"
  }
}
```

### POST /api/files/upload-json （上传JSON文件直接导入）

- **功能**：上传已解析完成的JSON文件，跳过AI解析步骤，直接导入题库
- **权限**：需要 Bearer Token
- **Content-Type**：multipart/form-data
- **适用场景**：
  - 已有标准格式的JSON题库文件
  - 从其他系统导出的题目数据
  - 手动整理好的题目数据
- **请求参数**：
  - `file` （必填）：JSON文件对象
- **JSON文件格式要求**：
```json
{
  "questions": [
    {
      "question": "1",
      "type": "single",
      "content": "题目内容",
      "options": ["A.选项1", "B.选项2", "C.选项3", "D.选项4"],
      "answer": "A",
      "explanation": "解析内容",
      "difficulty": 1,
      "tags": ["第01章-章节名称"]
    },
    {
      "question": "2",
      "type": "multiple",
      "content": "多选题内容",
      "options": ["A.选项1", "B.选项2", "C.选项3", "D.选项4"],
      "answer": "ABC",
      "explanation": "解析内容",
      "difficulty": 2,
      "tags": ["第01章-章节名称"]
    }
  ]
}
```
- **字段说明**：
  - `questions` （必填）：题目数组
  - `type` （必填）：题型，支持 single/multiple/judge/fill/essay
  - `content` （必填）：题目内容
  - `answer` （必填）：答案
  - `options` （可选）：选项数组，选择题必填
  - `explanation` （可选）：解析说明
  - `difficulty` （可选）：难度，1-简单 2-中等 3-困难
  - `tags` （可选）：标签数组，**第一个标签将作为章节名称**
- **响应示例**：
```json
{
  "code": 200,
  "message": "JSON文件导入成功",
  "data": {
    "id": 10,
    "name": "gemin",
    "description": "从JSON文件导入，共1000题",
    "file_type": "question_bank",
    "file_original_name": "gemin.json",
    "file_path": "/uploads/gemin.json",
    "file_size": 2048576,
    "parse_status": "completed",
    "total_questions": 1000,
    "created_by": 1,
    "created_at": "2025-10-29 17:00:00",
    "updated_at": "2025-10-29 17:00:00"
  }
}
```
- **导入流程**：
  1. 系统读取JSON文件并验证格式
  2. 使用文件名（去掉.json后缀）作为题库名称
  3. 保存原始JSON到 `parse_results` 表（备份）
  4. 按 `tags[0]` 字段自动拆分为不同章节
  5. 将题目分章节保存到 `question_chapters` 和 `questions` 表
  6. 题库状态自动设为 `completed`
- **章节自动识别**：
  - 系统会提取每题的 `tags[0]` 作为章节名称
  - 相同章节的题目归为一组
  - 章节按名称中的数字自动排序（如"第01章"、"第02章"）
  - 未设置tags的题目归入"未分类"章节
- **错误响应示例**：
```json
{
  "code": 400,
  "message": "JSON格式错误，请检查文件内容",
  "data": null
}
```
```json
{
  "code": 400,
  "message": "JSON文件格式错误：缺少questions数组",
  "data": null
}
```
```json
{
  "code": 400,
  "message": "第5题缺少必要字段(type, content, answer)",
  "data": null
}
```

### POST /api/files/{id}/parse （AI解析文件）
- **功能**：使用AI解析文件
- **权限**：需要 Bearer Token；文件上传者
- **描述**：使用指定的AI供应商和模型自动解析文件（题库或知识库），提取内容并存储
- **请求体**：
```json
{
  "providerId": 1,
  "modelName": "gpt-4-turbo"
}
```
- **字段说明**：
  - `providerId` （必填）：AI供应商ID，可通过 `GET /api/system/providers` 获取
  - `modelName` （必填）：模型名称，可通过 `GET /api/system/providers/{id}/models` 获取
- **响应示例**：
```json
{
  "code": 200,
  "message": "AI解析任务已启动",
  "data": {
    "message": "AI解析任务已启动",
    "taskId": "task_1_1728550800000"
  },
  "timestamp": "2025-10-10T16:00:00.123Z"
}
```
- **使用流程**：
  1. 上传文件时指定 `fileType`（题库/知识库）
  2. 获取可用的供应商列表（仅启用的）：`GET /api/system/providers?status=1`
  3. 根据供应商ID获取可用模型：`GET /api/system/providers/{id}/models`
  4. 选择模型后调用解析接口
  5. 通过 `GET /api/files/{id}/parse-status` 查询解析进度
- **解析说明**：
  - 系统会读取文件内容，根据文件类型构造提示词发送给AI
  - 支持自定义提示词（通过 `POST /api/system/knowledge-format` 或 `POST /api/system/question-parse-format` 配置）
  - AI返回结构化数据（JSON格式）
  - 系统自动按章节拆分保存到 `question_chapters` 和 `questions` 表
  - **题库文件**：识别单选题、多选题、判断题、填空题、问答题
  - **知识库文件**：提取知识点标题和内容
- **错误响应**：
```json
{
  "code": 404,
  "message": "供应商配置不存在",
  "data": null,
  "timestamp": "2025-10-10T16:00:00.123Z"
}
```

### 自定义提示词配置

管理员可以通过系统设置接口自定义AI解析提示词：

#### 题库解析提示词
```bash
POST /api/system/question-parse-format
{
  "prompt": "你的自定义题库解析提示词..."
}
```

#### 知识库解析提示词
```bash
POST /api/system/knowledge-format
{
  "prompt": "你的自定义知识库解析提示词..."
}
```

**说明**：
- 如果未配置自定义提示词，系统使用内置的默认提示词
- 自定义提示词可以针对特定格式的文件优化解析效果
- 配置后立即生效，所有新的解析任务都会使用新提示词

### 数据库扩展

- **question_banks 表新增字段**：
  - `file_type` ENUM('question_bank', 'knowledge_base') - 文件类型
  - `provider_id` INT - AI供应商ID（外键关联 ai_providers）
  - `model_name` VARCHAR(100) - 使用的模型名称
  - 这些字段记录了文件类型和解析时使用的AI信息

---

## 📊 解析结果管理模块

### 概述
解析结果管理模块用于查询、管理和统计AI解析文件后生成的题目数据。每次文件解析会创建一条解析结果记录，包含该次解析的所有题目信息。

**数据表**: `parse_results`
- 每次解析创建一条记录
- 题目以JSON格式存储
- 支持历史版本追溯

### GET /api/parse-results （获取解析结果列表）

- **功能**：分页查询解析结果列表，支持按题库ID筛选
- **权限**：需要 Bearer Token
- **查询参数**：
  - `bank_id` （可选）：题库ID，筛选特定题库的解析结果
  - `page` （可选）：页码，默认1
  - `limit` （可选）：每页数量，默认20，最大100

#### 请求示例
```bash
# 获取所有解析结果
GET /api/parse-results?page=1&limit=20

# 获取指定题库的解析结果
GET /api/parse-results?bank_id=2&page=1&limit=10
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取解析结果列表成功",
  "data": {
    "results": [
      {
        "id": 5,
        "bank_id": 2,
        "questions": [
          {
            "type": "single",
            "content": "以下哪个是JavaScript的数据类型？",
            "options": ["String", "Integer", "Float", "Char"],
            "answer": "A",
            "explanation": "JavaScript有7种基本数据类型",
            "difficulty": 1,
            "tags": ["JavaScript", "数据类型"]
          }
        ],
        "total_questions": 50,
        "created_at": "2025-10-26 10:30:45",
        "updated_at": "2025-10-26 10:30:45",
        "bank_name": "前端开发题库",
        "file_name": "frontend_questions.pdf"
      }
    ],
    "total": 8,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

### GET /api/parse-results/:id （获取单个解析结果）

- **功能**：根据ID获取解析结果的完整信息
- **权限**：需要 Bearer Token
- **路径参数**：
  - `id` （必填）：解析结果ID（数字）

#### 请求示例
```bash
GET /api/parse-results/5
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取解析结果成功",
  "data": {
    "id": 5,
    "bank_id": 2,
    "questions": [...],
    "total_questions": 50,
    "created_at": "2025-10-26 10:30:45",
    "bank_name": "前端开发题库",
    "file_name": "frontend_questions.pdf"
  }
}
```

### GET /api/parse-results/bank/:bankId （获取题库的所有解析结果）

- **功能**：获取指定题库的所有解析结果历史记录
- **权限**：需要 Bearer Token
- **路径参数**：
  - `bankId` （必填）：题库ID

#### 请求示例
```bash
GET /api/parse-results/bank/2
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取题库解析结果成功",
  "data": [
    {
      "id": 8,
      "bank_id": 2,
      "questions": [...],
      "total_questions": 55,
      "created_at": "2025-10-26 15:20:30",
      "bank_name": "前端开发题库",
      "file_name": "frontend_questions_v2.pdf"
    },
    {
      "id": 5,
      "bank_id": 2,
      "questions": [...],
      "total_questions": 50,
      "created_at": "2025-10-26 10:30:45",
      "bank_name": "前端开发题库",
      "file_name": "frontend_questions.pdf"
    }
  ]
}
```

**说明**：
- 结果按创建时间倒序排列（最新的在前）
- 可用于版本对比和历史追溯

### GET /api/parse-results/bank/:bankId/stats （获取题库统计）

- **功能**：获取指定题库的统计信息
- **权限**：需要 Bearer Token
- **路径参数**：
  - `bankId` （必填）：题库ID

#### 请求示例
```bash
GET /api/parse-results/bank/2/stats
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取题库解析统计成功",
  "data": {
    "parse_count": 3,
    "total_questions": 158,
    "last_parse_time": "2025-10-26 15:20:30"
  }
}
```

**字段说明**：
- `parse_count`: 解析次数
- `total_questions`: 所有解析结果的题目数量总和
- `last_parse_time`: 最后一次解析时间

### DELETE /api/parse-results/:id （删除解析结果）

- **功能**：删除指定的解析结果记录
- **权限**：需要 Bearer Token
- **路径参数**：
  - `id` （必填）：解析结果ID

#### 请求示例
```bash
DELETE /api/parse-results/5
```

#### 响应示例
```json
{
  "code": 200,
  "message": "删除解析结果成功",
  "data": null
}
```

### Questions JSON 格式说明

题目数据存储格式：
```json
{
  "type": "single",           // 题型: single/multiple/judge/fill/essay
  "content": "题目内容",
  "options": ["A", "B", "C", "D"],  // 选项（选择题）
  "answer": "A",              // 答案
  "explanation": "解析内容",
  "difficulty": 1,            // 难度: 1(简单) 2(中等) 3(困难)
  "tags": ["标签1", "标签2"],
  "page_number": 1,           // 页码（可选）
  "confidence_score": 0.95    // AI置信度（可选）
}
```

### 数据表结构

**parse_results 表**:
- `id` INT - 主键
- `bank_id` INT - 关联题库ID
- `questions` JSON - 题目数组
- `total_questions` INT - 题目总数
- `created_at` DATETIME - 创建时间
- `updated_at` DATETIME - 更新时间

**关联关系**:
- 与 `question_banks` 表建立外键关联
- 删除题库时级联删除所有解析结果

---

## 📚 题库管理模块

### 概述
题库管理模块提供题库的查询和管理功能，支持获取题库列表、题库详情和题库统计信息。

**数据表**: `question_banks`
- 存储题库基本信息（名称、描述、创建者等）
- 记录题目总数和解析状态
- 支持分页查询

### GET /api/questions/banks （获取题库列表）

- **功能**：获取所有已完成解析的题库列表，自动包含当前登录用户的学习进度汇总
- **权限**：需要 Bearer Token
- **查询参数**：
  - `page` （可选）：页码，默认1
  - `limit` （可选）：每页数量，默认20，最大100

#### 请求示例
```bash
GET /api/questions/banks?page=1&limit=20
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取题库列表成功",
  "data": {
    "banks": [
      {
        "id": 15,
        "name": "系统架构师题库",
        "description": "2024年系统架构师考试题库",
        "file_original_name": "系统架构师.pdf",
        "file_type": "pdf",
        "file_size": 2048000,
        "parse_status": "completed",
        "question_count": 1000,
        "creator_name": "张三",
        "created_by": 10,
        "created_at": "2025-10-29 10:00:00",
        "updated_at": "2025-10-29 11:00:00",
        "study_progress": {
          "total_chapters": 10,
          "studied_chapters": 3,
          "completed_questions": 150,
          "total_questions": 1000,
          "progress_percentage": 15,
          "last_study_time": "2025-10-29 23:00:00"
        }
      },
      {
        "id": 16,
        "name": "网络工程师题库",
        "description": null,
        "file_original_name": "网络工程师真题.pdf",
        "file_type": "pdf",
        "file_size": 1536000,
        "parse_status": "completed",
        "question_count": 800,
        "creator_name": "李四",
        "created_by": 11,
        "created_at": "2025-10-28 15:30:00",
        "updated_at": "2025-10-28 16:45:00",
        "study_progress": {
          "total_chapters": 8,
          "studied_chapters": 0,
          "completed_questions": 0,
          "total_questions": 800,
          "progress_percentage": 0,
          "last_study_time": null
        }
      }
    ],
    "total": 25,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

#### 字段说明
- **study_progress**：学习进度汇总信息（仅登录用户）
  - `total_chapters`：题库总章节数
  - `studied_chapters`：已开始学习的章节数
  - `completed_questions`：已完成的题目总数（所有章节累加）
  - `total_questions`：题库题目总数
  - `progress_percentage`：整体学习进度百分比
  - `last_study_time`：最近一次学习时间（任意章节）

### GET /api/questions/banks/:id （获取题库详情）

- **功能**：获取指定题库的详细信息和统计数据
- **权限**：需要 Bearer Token
- **路径参数**：
  - `id` （必填）：题库ID

#### 请求示例
```bash
GET /api/questions/banks/15
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取题库详情成功",
  "data": {
    "id": 15,
    "name": "系统架构师题库",
    "description": "2024年系统架构师考试题库",
    "file_original_name": "系统架构师.pdf",
    "file_type": "pdf",
    "file_size": 2048000,
    "parse_status": "completed",
    "creator_name": "张三",
    "created_by": 10,
    "created_at": "2025-10-29 10:00:00",
    "updated_at": "2025-10-29 11:00:00",
    "stats": {
      "total_questions": 1000,
      "single_choice": 600,
      "multiple_choice": 250,
      "judge": 100,
      "fill": 30,
      "essay": 20,
      "difficulty_easy": 300,
      "difficulty_medium": 500,
      "difficulty_hard": 200
    }
  }
}
```

#### 错误响应
```json
{
  "code": 404,
  "message": "题库不存在"
}
```

---

## 📚 章节管理模块

### 概述
章节管理模块用于按章节组织和管理题目，优化题目加载性能。当AI解析文件后，系统会自动按照题目的`tags`字段（取第一个标签作为章节名）将题目拆分到不同章节中存储。

**数据表**: `question_chapters` + `questions`
- 支持按章节分页查询题目
- 避免一次性加载大量题目导致性能问题
- 前端可按需加载不同章节内容

### GET /api/question-banks/:bankId/chapters （获取题库章节列表）

- **功能**：获取指定题库的所有章节
- **权限**：需要 Bearer Token
- **路径参数**：
  - `bankId` （必填）：题库ID

#### 请求示例
```bash
GET /api/question-banks/2/chapters
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取题库章节成功",
  "data": {
    "chapters": [
      {
        "id": 1,
        "bank_id": 2,
        "chapter_name": "第01章-信息化发展",
        "chapter_order": 1,
        "question_count": 50,
        "created_at": "2025-10-29 16:30:00",
        "updated_at": "2025-10-29 16:30:00"
      },
      {
        "id": 2,
        "bank_id": 2,
        "chapter_name": "第02章-信息技术发展",
        "chapter_order": 2,
        "question_count": 48,
        "created_at": "2025-10-29 16:30:00",
        "updated_at": "2025-10-29 16:30:00"
      }
    ],
    "totalChapters": 20
  }
}
```

### GET /api/question-banks/:bankId/chapters/stats （获取题库章节统计）

- **功能**：获取题库的章节统计信息
- **权限**：需要 Bearer Token
- **路径参数**：
  - `bankId` （必填）：题库ID

#### 请求示例
```bash
GET /api/question-banks/2/chapters/stats
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取题库章节统计成功",
  "data": {
    "totalChapters": 20,
    "totalQuestions": 1000,
    "chapters": [
      { "name": "第01章-信息化发展", "count": 50 },
      { "name": "第02章-信息技术发展", "count": 48 }
    ]
  }
}
```

### GET /api/question-banks/:bankId/chapters/:chapterId （获取章节详情）

- **功能**：获取指定题库的指定章节详细信息
- **权限**：需要 Bearer Token
- **路径参数**：
  - `bankId` （必填）：题库ID
  - `chapterId` （必填）：章节ID

#### 请求示例
```bash
GET /api/question-banks/2/chapters/1
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取章节详情成功",
  "data": {
    "id": 1,
    "bank_id": 2,
    "chapter_name": "第01章-信息化发展",
    "chapter_order": 1,
    "question_count": 50,
    "created_at": "2025-10-29 16:30:00",
    "updated_at": "2025-10-29 16:30:00"
  }
}
```

#### 错误响应
```json
{
  "code": 404,
  "message": "章节不存在或不属于该题库"
}
```

### GET /api/question-banks/:bankId/chapters/:chapterId/questions （获取章节题目）

- **功能**：获取指定题库的指定章节的题目列表，支持三种模式
- **权限**：需要 Bearer Token
- **路径参数**：
  - `bankId` （必填）：题库ID
  - `chapterId` （必填）：章节ID
- **查询参数**：
  - `questionNumber` （可选）：题号（从1开始），传入时返回单个题目（逐题答题场景）
  - `page` （可选）：页码，默认1（仅在分页模式下有效）
  - `limit` （可选）：每页数量，**默认0（返回全部题目）**，设置具体数值时最大100

#### 使用场景

**1️⃣ 单题模式（推荐）**：逐题加载，减轻网络压力
```bash
# 获取第1题
GET /api/question-banks/2/chapters/1/questions?questionNumber=1

# 获取第2题
GET /api/question-banks/2/chapters/1/questions?questionNumber=2

# 获取第50题
GET /api/question-banks/2/chapters/1/questions?questionNumber=50

# 超出范围（如第51题，但只有50题）
GET /api/question-banks/2/chapters/1/questions?questionNumber=51
```

**2️⃣ 全量模式**：一次性加载所有题目
```bash
GET /api/question-banks/2/chapters/1/questions
```

**3️⃣ 分页模式**：题库管理场景
```bash
GET /api/question-banks/2/chapters/1/questions?page=1&limit=20
GET /api/question-banks/2/chapters/1/questions?page=2&limit=20
```

#### 响应示例

**单题模式响应**（推荐）：
```json
{
  "code": 200,
  "message": "获取题目成功",
  "data": {
    "question": {
      "id": 101,
      "bank_id": 2,
      "chapter_id": 1,
      "question_no": "1",
      "type": "single",
      "content": "关于信息的描述，不正确的是（）。",
      "options": ["A.选项1", "B.选项2", "C.选项3", "D.选项4"],
      "answer": "D",
      "explanation": "解析内容...",
      "difficulty": 2,
      "tags": ["第01章-信息化发展"],
      "bank_name": "系统架构师题库",
      "chapter_name": "第01章-信息化发展"
    },
    "total": 50,
    "currentNumber": 1,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**超出范围响应**：
```json
{
  "code": 200,
  "message": "没有更多题目了",
  "data": {
    "total": 50
  }
}
```

**全量/分页模式响应**：
```json
{
  "code": 200,
  "message": "获取章节题目成功",
  "data": {
    "questions": [
      {
        "id": 101,
        "bank_id": 2,
        "chapter_id": 1,
        "question_no": "1",
        "type": "single",
        "content": "关于信息的描述，不正确的是（）。",
        "options": ["A.选项1", "B.选项2", "C.选项3", "D.选项4"],
        "answer": "D",
        "explanation": "解析内容...",
        "difficulty": 2,
        "tags": ["第01章-信息化发展"],
        "bank_name": "系统架构师题库",
        "chapter_name": "第01章-信息化发展"
      }
    ],
    "total": 50,
    "pagination": {
      "page": 1,
      "limit": 0,
      "total": 50,
      "totalPages": 1
    }
  }
}
```

### DELETE /api/question-banks/:bankId/chapters/:chapterId （删除章节）

- **功能**：删除指定题库的指定章节（级联删除该章节下的所有题目）
- **权限**：需要 Bearer Token
- **路径参数**：
  - `bankId` （必填）：题库ID
  - `chapterId` （必填）：章节ID

#### 请求示例
```bash
DELETE /api/question-banks/2/chapters/1
```

#### 响应示例
```json
{
  "code": 200,
  "message": "删除章节成功",
  "data": null
}
```

#### 错误响应
```json
{
  "code": 404,
  "message": "章节不存在或不属于该题库"
}
```

### 前端使用示例

#### 1. 获取题库章节列表
```javascript
// 获取题库的所有章节
const response = await fetch('/api/question-banks/2/chapters', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
console.log('章节列表:', data.chapters);
console.log('共有章节数:', data.totalChapters);
```

#### 2. 按章节分页加载题目
```javascript
// 用户选择章节后，按页加载题目
async function loadChapterQuestions(chapterId, page = 1) {
  const response = await fetch(
    `/api/chapters/${chapterId}/questions?page=${page}&limit=20`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const { data } = await response.json();
  
  return {
    questions: data.questions,
    pagination: data.pagination
  };
}

// 使用示例
const result = await loadChapterQuestions(1, 1);
console.log('题目列表:', result.questions);
console.log('总页数:', result.pagination.totalPages);
```

### 数据表结构

**question_chapters 表**:
- `id` INT - 主键
- `bank_id` INT - 关联题库ID
- `chapter_name` VARCHAR(200) - 章节名称
- `chapter_order` INT - 章节顺序
- `question_count` INT - 该章节题目数量
- `created_at` DATETIME - 创建时间
- `updated_at` DATETIME - 更新时间

**questions 表**:
- `id` INT - 主键
- `bank_id` INT - 关联题库ID
- `chapter_id` INT - 关联章节ID
- `question_no` VARCHAR(50) - 题号
- `type` ENUM - 题型（single/multiple/judge/fill/essay）
- `content` TEXT - 题目内容
- `options` JSON - 选项数组
- `answer` TEXT - 答案
- `explanation` TEXT - 解析
- `difficulty` INT - 难度（1-3）
- `tags` JSON - 标签数组
- `created_at` DATETIME - 创建时间
- `updated_at` DATETIME - 更新时间

**关联关系**:
- `question_chapters` 与 `question_banks` 建立外键关联
- `questions` 与 `question_chapters` 建立外键关联
- 删除题库时级联删除所有章节和题目
- 删除章节时级联删除该章节下的所有题目

### 性能优势

**旧方案（parse_results表）**：
- ❌ 一次性返回1000+题目，响应体达数MB
- ❌ 前端加载缓慢，用户体验差
- ❌ 无法按需加载

**新方案（章节表拆分）**：
- ✅ 按章节分页查询，每次仅返回20题
- ✅ 响应速度快，用户体验好
- ✅ 支持按需加载，节省流量
- ✅ 便于按章节管理和检索

---

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如用户名重复） |
| 500 | 服务器内部错误 |

## 🔄 统一响应格式

所有API接口都遵循以下响应格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 具体的响应数据
  },
  "timestamp": "2025-09-28T14:12:19.123Z"
}
```

### 成功响应示例
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "admin",
    "nickname": "管理员"
  },
  "timestamp": "2025-09-28T14:12:19.123Z"
}
```

### 错误响应示例
```json
{
  "code": 400,
  "message": "用户名不能为空",
  "data": null,
  "timestamp": "2025-09-28T14:12:19.123Z"
}
```

## 🔐 认证模块

### 1. 用户登录（支持微信和普通用户）

**接口**: `POST /api/auth/login`  
**描述**: 统一登录接口，根据参数自动识别登录方式

#### 🎯 微信登录方式

**请求参数**:
```json
{
  "code": "微信授权码"
}
```

#### 🎯 普通用户登录方式

**请求参数**:
```json
{
  "username": "用户名",
  "password": "密码"
}
```

**成功响应**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "2h",
    "user": {
      "id": 1,
      "openid": "wx123456789",  // 微信用户有此字段
      "username": null,          // 微信用户此字段为null
      "nickname": "微信用户",
      "avatar_url": "https://wx.qlogo.cn/...",
      "phone": null,
      "role_id": 2,
      "status": 1,
      "created_at": "2025-09-28T10:30:00.000Z",
      "updated_at": "2025-09-28T14:12:19.000Z"
    }
  },
  "timestamp": "2025-09-28T14:12:19.123Z"
}
```

**错误响应**:
```json
{
  "code": 401,
  "message": "用户名或密码错误",
  "data": null,
  "timestamp": "2025-09-28T14:12:19.123Z"
}
```

### 2. 普通用户注册

**接口**: `POST /api/auth/register`  
**描述**: 普通用户注册，注册成功后自动登录

**请求参数**:
```json
{
  "username": "admin",
  "password": "MyPassword123",
  "nickname": "管理员",
  "phone": "13800138000"
}
```

**成功响应**:
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "2h",
    "user": {
      "id": 2,
      "openid": null,            // 普通用户此字段为null
      "username": "admin",       // 普通用户有此字段
      "nickname": "管理员",
      "avatar_url": "",
      "phone": "13800138000",
      "role_id": 2,
      "status": 1,
      "created_at": "2025-09-28T14:01:02.000Z",
      "updated_at": "2025-09-28T14:01:02.000Z"
    }
  },
  "timestamp": "2025-09-28T14:12:19.123Z"
}
```

**错误响应**:
```json
{
  "code": 409,
  "message": "用户名已存在，请选择其他用户名",
  "data": null,
  "timestamp": "2025-09-28T14:12:19.123Z"
}

### 3. 获取用户信息

**接口**: `GET /api/auth/profile`  
**描述**: 获取当前登录用户的详细信息

### 4. 文件列表

**接口**: `GET /api/files`
**描述**: 获取文件列表
**权限**: 需要 Bearer Token；普通用户仅能查看自己上传的文件，管理员/超级管理员可查看全部文件。

**接口**: `PUT /api/auth/profile`  
**描述**: 更新当前用户信息  
**认证**: 需要Bearer Token

**请求参数**:
```json
{
  "nickname": "新昵称",
  "avatar_url": "https://example.com/avatar.jpg",
  "phone": "13900139000"
}
```

### 5. 刷新Token

**接口**: `POST /api/auth/refresh`  
**描述**: 使用refresh token获取新的access token

**请求头**:
```
Authorization: Bearer refresh_token_here
```

### 6. 用户登出

**接口**: `POST /api/auth/logout`  
**描述**: 用户登出  
**认证**: 需要Bearer Token

## 📝 数据模型

### User (用户)
```json
{
  "id": "number",           // 用户ID
  "openid": "string|null",  // 微信openid，普通用户为null
  "unionid": "string|null", // 微信unionid
  "username": "string|null", // 用户名，微信用户为null
  "password": "string|null", // 密码hash，不在API中返回
  "nickname": "string",     // 用户昵称
  "avatar_url": "string",   // 头像URL
  "phone": "string|null",   // 手机号
  "role_id": "number",      // 角色ID
  "status": "number",       // 用户状态 (1:正常, 0:禁用)
  "last_login_at": "string", // 最后登录时间
  "created_at": "string",   // 创建时间
  "updated_at": "string"    // 更新时间
}
```

## 🔧 用户类型说明

### 微信用户
- `openid`: 有值
- `unionid`: 可能有值
- `username`: null
- `password`: null

### 普通用户
- `openid`: null
- `unionid`: null
- `username`: 有值
- `password`: 有值（不在API响应中返回）

## 📱 使用示例

### 普通用户注册和登录流程

1. **注册**:
```javascript
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    password: 'MyPassword123',
    nickname: '测试用户'
  })
});
const { data: registerData } = await registerResponse.json();
console.log('注册成功，Token:', registerData.accessToken);
```

2. **登录**:
```javascript
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    password: 'MyPassword123'
  })
});
const { data: loginData } = await loginResponse.json();
console.log('登录成功，Token:', loginData.accessToken);
```

3. **获取用户信息**:
```javascript
const profileResponse = await fetch('/api/auth/profile', {
  headers: { 
    'Authorization': `Bearer ${loginData.accessToken}`,
    'Content-Type': 'application/json'
  }
});
const { data: profileData } = await profileResponse.json();
console.log('用户信息:', profileData);
```

### 微信小程序登录流程

```javascript
// 微信小程序端
wx.login({
  success: async (res) => {
    const loginResponse = await wx.request({
      url: 'https://yourapi.com/api/auth/login',
      method: 'POST',
      data: { code: res.code }
    });
    
    if (loginResponse.data.code === 200) {
      const { accessToken, user } = loginResponse.data.data;
      console.log('登录成功:', user);
      // 存储token用于后续请求
      wx.setStorageSync('accessToken', accessToken);
    }
  }
});
```

## 🛠️ 开发指南

### 响应日志监控

系统提供详细的API响应日志，便于开发调试：

```
✅ API成功响应 [200]: 获取成功
👤 用户数据响应: {userId: 2, hasUsername: true, hasOpenid: false}
🔑 Token响应详情: {hasAccessToken: true, accessTokenLength: 142}
```

### 错误处理

所有接口都遵循统一的错误处理格式，便于前端统一处理：

```javascript
try {
  const response = await fetch('/api/auth/login', options);
  const result = await response.json();
  
  if (result.code === 200) {
    // 成功处理
    console.log('Success:', result.data);
  } else {
    // 错误处理
    console.error('Error:', result.message);
  }
} catch (error) {
  console.error('Network Error:', error);
}
```

## 📞 技术支持

如遇到问题，请检查：
1. 请求格式是否正确
2. 认证Token是否有效
3. 服务器日志中的详细错误信息
4. 网络连接是否正常

---

**注意**: 
- 所有需要认证的接口都需要在请求头中包含有效的Bearer Token
- Token有效期为2小时，过期后需要使用refresh token刷新
- 生产环境建议启用HTTPS加密传输
## 鍗曡瘝涔︾粌涔?鎵╁睍鍔熻兘

### 鏀惰棌鍗曡瘝
- `GET /api/word-books/{id}/favorites`
  - 鑾峰彇褰撳墠鍗曡瘝涔︾殑鎵€鏈夋敹钘忓崟璇嶅拰鏃堕棿鐐规竻鍐?;
- `POST /api/word-books/{id}/favorites`
  - Request Body
    ```json
    {
      "entryId": 12
    }
    ```
  - 鎻愬彇 entryId 骞惰〃绀烘敹钘忓垪琛ㄤ腑鐨勯噸澶嶆甯革紝鎴愬姛鍚庨噸杞借繑鍥炵敤鎴疯鐪嬬殑鏀惰棌鍒楄〃銆?
- `DELETE /api/word-books/{id}/favorites`
  - Request Body 涓庡悓涓婁竴鏍峰紡锛岄€氳繃 entryId 鎸囧畾瑕佽繛绂荤殑鍗曡瘝銆?

### 閿欓鍒楄〃
- `GET /api/word-books/{id}/wrong-words` 鑾峰彇宸插姞鍏ラ敊棰樿〃鍗曠煡璇㈠拰 wrong_times 璁℃暟銆?
- `POST /api/word-books/{id}/wrong-words` Request Body 鍚屼竴锛岀敤浜庣Н鏋缁撴灉鍗曡瘝鍑洪敊銆?
- `DELETE /api/word-books/{id}/wrong-words` Request Body 鎸囩ず entryId 鐢ㄦ埛鍙负閲嶇疆閿欓銆?

### 瀛︿範杩涘害
- `GET /api/word-books/{id}/progress`
  ```json
  {
    "book": { "id": 1, "name": "CET-4" },
    "progress": {
      "book_id": 1,
      "total_words": 200,
      "completed_count": 40,
      "current_index": 40,
      "current_entry_id": 88,
      "progress_percentage": 20,
      "notes": "keep going",
      "current_entry": {
        "id": 88,
        "word": "inspire",
        "translation": "鍚戠郴"
      }
    }
  }
  ```
- `POST /api/word-books/{id}/progress`
  - Body Parameters: `completedCount`/`currentIndex`/`currentEntryId`/`totalWords`/`notes` 锛屽彲鍗曚釜鎴栧涓湪涓€娆℃洿鏂伴噸灏忔椂鍙戣捣
- `DELETE /api/word-books/{id}/progress`
  - 閲嶇疆鍚庤繑鍥炲崟璇嶆椂杩涘害涓篺ull锛岃幏鍙栫被鍨嬫洿鎹㈠簲鐢ㄦ帴鍙ｇ殑鐩稿叧鍊?。
