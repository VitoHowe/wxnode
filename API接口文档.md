# 微信小程序题库管理系统 API 接口文档

**版本**: v2.0  
**最后更新**: 2025-10-26  
**基础URL**: `http://localhost:3001/api`

## 📋 目录

1. [更新日志](#更新日志)
2. [通用说明](#通用说明)
3. [认证模块](#认证模块)
4. [用户管理](#用户管理)
5. [文件管理](#文件管理)
6. [题库管理](#题库管理)
7. [解析结果管理](#解析结果管理)
8. [用户学习进度](#用户学习进度)
9. [系统设置](#系统设置)
10. [数据模型](#数据模型)

---

## 📋 更新日志

### v2.0 (2025-10-26)
- ✅ **整合文档**: 将所有API文档整合为统一文档
- ✅ **清理文档**: 删除过时和重复的文档
- ✅ **用户学习进度**: 新增用户学习进度管理接口
- ✅ **解析结果管理**: 完善解析结果的完整CRUD接口
- ✅ **文档优化**: 统一接口文档格式和结构

### v1.5.0 (2025-10-26)
- ✅ **解析结果管理模块**: 新增解析结果的完整CRUD接口
- ✅ **路由优化**: 修复解析结果路由冲突问题，优化路由匹配顺序
- ✅ **历史追溯**: 支持查看题库的所有历史解析记录
- ✅ **统计分析**: 新增题库解析统计接口

### v1.4.0 (2025-10-10)
- ✅ **重构AI供应商架构**: 将模型配置重构为AI供应商配置
- ✅ **支持多种AI供应商**: OpenAI/Gemini/Qwen等
- ✅ **AI文件解析**: 文件解析接口集成AI供应商

---

## 🌐 通用说明

### 响应格式

所有API接口都遵循统一的响应格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2025-10-26T14:12:19.123Z"
}
```

### 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 认证失败/未登录 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

### 认证方式

需要认证的接口在请求头中携带JWT Token：

```
Authorization: Bearer <your_access_token>
```

---

## 🔐 认证模块

### 1. 用户登录

**接口**: `POST /api/auth/login`  
**描述**: 统一登录接口，支持微信小程序登录和普通用户登录

#### 微信登录

**请求参数**:
```json
{
  "code": "微信授权码"
}
```

#### 普通用户登录

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
      "username": "admin",
      "nickname": "管理员",
      "role_id": 2,
      "status": 1
    }
  }
}
```

### 2. 用户注册

**接口**: `POST /api/auth/register`  
**描述**: 普通用户注册

**请求参数**:
```json
{
  "username": "admin",
  "password": "MyPassword123",
  "nickname": "管理员",
  "phone": "13800138000"
}
```

### 3. 刷新Token

**接口**: `POST /api/auth/refresh`  
**描述**: 使用refresh token获取新的access token

**请求参数**:
```json
{
  "refreshToken": "your_refresh_token"
}
```

### 4. 获取用户信息

**接口**: `GET /api/auth/profile`  
**描述**: 获取当前登录用户的详细信息  
**认证**: 需要Bearer Token

### 5. 更新用户信息

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

### 6. 用户登出

**接口**: `POST /api/auth/logout`  
**描述**: 用户登出，使令牌失效  
**认证**: 需要Bearer Token

---

## 👥 用户管理

### 1. 获取用户列表

**接口**: `GET /api/users`  
**描述**: 获取系统中的用户列表（管理员权限）  
**认证**: 需要Bearer Token（管理员）

**查询参数**:
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `keyword`: 搜索关键词

### 2. 获取用户详情

**接口**: `GET /api/users/:id`  
**描述**: 根据用户ID获取用户详细信息  
**认证**: 需要Bearer Token

### 3. 更新用户信息

**接口**: `PUT /api/users/:id`  
**描述**: 更新指定用户的信息（管理员权限）  
**认证**: 需要Bearer Token（管理员）

### 4. 删除用户

**接口**: `DELETE /api/users/:id`  
**描述**: 删除指定用户（管理员权限）  
**认证**: 需要Bearer Token（管理员）

---

## 📂 文件管理

### 1. 上传文件

**接口**: `POST /api/files/upload`  
**描述**: 上传题库或知识库文件  
**认证**: 需要Bearer Token  
**Content-Type**: multipart/form-data

**请求参数**:
- `file`: 文件对象（必填）
- `name`: 文件名称（必填）
- `description`: 文件描述（可选）
- `fileType`: 文件类型（可选）
  - `question_bank` - 题库文件（默认）
  - `knowledge_base` - 知识库文件

**支持的文件格式**: PDF, DOC, DOCX, TXT, MD, XLSX, XLS, CSV, JSON, JPG, PNG, GIF, BMP, WEBP

### 2. 获取文件列表

**接口**: `GET /api/files`  
**描述**: 获取用户上传的文件列表  
**认证**: 需要Bearer Token

**查询参数**:
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `status`: 解析状态筛选（pending/parsing/completed/failed）

### 3. 获取文件详情

**接口**: `GET /api/files/:id`  
**描述**: 获取指定文件的详细信息  
**认证**: 需要Bearer Token

### 4. AI解析文件

**接口**: `POST /api/files/:id/parse`  
**描述**: 使用指定的AI供应商和模型解析文件  
**认证**: 需要Bearer Token

**请求参数**:
```json
{
  "providerId": 1,
  "modelName": "gpt-4-turbo"
}
```

**使用流程**:
1. 上传文件时指定 `fileType`（题库/知识库）
2. 获取可用的供应商列表：`GET /api/system/providers?status=1`
3. 根据供应商ID获取可用模型：`GET /api/system/providers/{id}/models`
4. 选择模型后调用解析接口
5. 通过 `GET /api/files/{id}/parse-status` 查询解析进度

### 5. 获取解析状态

**接口**: `GET /api/files/:id/parse-status`  
**描述**: 获取文件解析的当前状态和进度  
**认证**: 需要Bearer Token

### 6. 更新解析状态

**接口**: `PATCH /api/files/:id/parse-status`  
**描述**: 手动更新文件解析状态（文件上传者/管理员）  
**认证**: 需要Bearer Token

**请求参数**:
```json
{
  "status": "completed"
}
```

### 7. 删除文件

**接口**: `DELETE /api/files/:id`  
**描述**: 删除指定的文件及其相关数据  
**认证**: 需要Bearer Token

---

## 📝 题库管理

### 1. 获取题目列表

**接口**: `GET /api/questions`  
**描述**: 获取题库中的题目列表，支持筛选和分页  
**认证**: 需要Bearer Token

**查询参数**:
- `bank_id`: 题库ID筛选
- `type`: 题目类型筛选（single/multiple/judge/fill/essay）
- `difficulty`: 难度等级筛选（1-3）
- `keyword`: 关键词搜索
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）

### 2. 获取题目详情

**接口**: `GET /api/questions/:id`  
**描述**: 根据题目ID获取详细信息  
**认证**: 需要Bearer Token

### 3. 获取题库列表

**接口**: `GET /api/questions/banks`  
**描述**: 获取所有可用的题库列表  
**认证**: 需要Bearer Token

### 4. 获取题库详情

**接口**: `GET /api/questions/banks/:id`  
**描述**: 根据题库ID获取详细信息和统计数据  
**认证**: 需要Bearer Token

### 5. 更新题目

**接口**: `PUT /api/questions/:id`  
**描述**: 更新指定题目的信息  
**认证**: 需要Bearer Token

**请求参数**:
```json
{
  "content": "题目内容",
  "options": ["A", "B", "C", "D"],
  "answer": "A",
  "explanation": "解析",
  "difficulty": 1,
  "tags": ["标签1", "标签2"]
}
```

### 6. 删除题目

**接口**: `DELETE /api/questions/:id`  
**描述**: 删除指定的题目  
**认证**: 需要Bearer Token

---

## 📊 解析结果管理

解析结果管理模块用于查询、管理和统计AI解析文件后生成的题目数据。每次文件解析会创建一条解析结果记录，包含该次解析的所有题目信息。

### 1. 获取解析结果列表

**接口**: `GET /api/parse-results`  
**描述**: 分页查询解析结果列表，支持按题库ID筛选  
**认证**: 需要Bearer Token

**查询参数**:
- `bank_id`: 题库ID，用于筛选特定题库的解析结果（可选）
- `page`: 页码，从1开始（默认1）
- `limit`: 每页数量，范围1-100（默认20）

**响应示例**:
```json
{
  "code": 200,
  "message": "获取解析结果列表成功",
  "data": {
    "results": [
      {
        "id": 5,
        "bank_id": 2,
        "questions": [...],
        "total_questions": 50,
        "created_at": "2025-10-26 10:30:45",
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

### 2. 获取单个解析结果

**接口**: `GET /api/parse-results/:id`  
**描述**: 根据ID获取解析结果的完整信息  
**认证**: 需要Bearer Token

### 3. 获取题库的所有解析结果

**接口**: `GET /api/parse-results/bank/:bankId`  
**描述**: 获取指定题库的所有解析结果历史记录  
**认证**: 需要Bearer Token

**说明**:
- 结果按创建时间倒序排列（最新的在前）
- 可用于版本对比和历史追溯

### 4. 获取题库统计

**接口**: `GET /api/parse-results/bank/:bankId/stats`  
**描述**: 获取指定题库的统计信息  
**认证**: 需要Bearer Token

**响应示例**:
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

### 5. 删除解析结果

**接口**: `DELETE /api/parse-results/:id`  
**描述**: 删除指定的解析结果记录  
**认证**: 需要Bearer Token

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

---

## 📈 用户学习进度

用户学习进度管理接口用于记录和追踪用户在各个题库中的学习情况，支持断点续学功能。

### 1. 获取用户在指定题库的学习进度

**接口**: `GET /api/user-progress/:bankId`  
**描述**: 获取当前用户在指定题库的学习进度，用于实现断点续学  
**认证**: 需要Bearer Token

**响应示例（有进度）**:
```json
{
  "code": 200,
  "message": "获取学习进度成功",
  "data": {
    "id": 1,
    "user_id": 10,
    "bank_id": 2,
    "parse_result_id": 5,
    "current_question_index": 15,
    "completed_count": 15,
    "total_questions": 50,
    "last_study_time": "2025-10-26 14:30:00",
    "bank_name": "前端开发题库",
    "file_name": "frontend_questions.pdf",
    "progress_percentage": 30
  }
}
```

**响应示例（无进度）**:
```json
{
  "code": 200,
  "message": "暂无学习进度",
  "data": null
}
```

### 2. 获取用户所有学习进度

**接口**: `GET /api/user-progress`  
**描述**: 获取当前用户在所有题库的学习进度列表  
**认证**: 需要Bearer Token

### 3. 保存/更新学习进度

**接口**: `POST /api/user-progress/:bankId`  
**描述**: 保存或更新用户在指定题库的学习进度  
**认证**: 需要Bearer Token

**请求参数**:
```json
{
  "parse_result_id": 5,
  "current_question_index": 20,
  "completed_count": 20,
  "total_questions": 50
}
```

**字段说明**:
- `parse_result_id`: 解析结果ID（可选）
- `current_question_index`: 当前题目索引，从0开始（必填）
- `completed_count`: 已完成题目数量（可选）
- `total_questions`: 总题目数量（必填）

### 4. 获取最近学习的题库

**接口**: `GET /api/user-progress/recent`  
**描述**: 获取用户最近学习的题库列表，按学习时间倒序  
**认证**: 需要Bearer Token

**查询参数**:
- `limit`: 返回数量（默认5）

### 5. 重置题库学习进度

**接口**: `DELETE /api/user-progress/:bankId`  
**描述**: 删除用户在指定题库的学习进度，重新开始  
**认证**: 需要Bearer Token

---

## ⚙️ 系统设置

### AI供应商配置

#### 1. 获取AI供应商配置列表

**接口**: `GET /api/system/providers`  
**描述**: 获取AI供应商配置列表  
**权限**: 需要Bearer Token；管理员或超级管理员

**查询参数**:
- `status`: 筛选状态（可选）
  - `0` - 仅返回已停用的供应商
  - `1` - 仅返回已启用的供应商
  - 不传 - 返回全部供应商（默认）

#### 2. 获取AI供应商配置详情

**接口**: `GET /api/system/providers/:id`  
**描述**: 获取指定AI供应商的配置详情  
**权限**: 需要Bearer Token；管理员或超级管理员

#### 3. 获取供应商可用模型列表

**接口**: `GET /api/system/providers/:id/models`  
**描述**: 获取指定供应商的可用模型列表  
**权限**: 需要Bearer Token；管理员或超级管理员

**说明**:
- 根据供应商类型自动调用对应API获取模型列表
- OpenAI：调用 OpenAI Models API
- Gemini：调用 Google Generative Language API
- Qwen：返回预定义的通义千问模型列表
- Custom：不支持自动获取

#### 4. 新建AI供应商配置

**接口**: `POST /api/system/providers`  
**描述**: 新增AI供应商配置  
**权限**: 需要Bearer Token；管理员或超级管理员

**请求参数**:
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

**字段说明**:
- `type`: 供应商类型，可选值：`openai` | `gemini` | `qwen` | `custom`（必填）
- `name`: 供应商实例名称，用于区分同类型不同配置（必填）
- `provider_config`: JSON对象，存储供应商特定参数（可选）

#### 5. 更新AI供应商配置

**接口**: `PUT /api/system/providers/:id`  
**描述**: 更新AI供应商配置  
**权限**: 需要Bearer Token；管理员或超级管理员

#### 6. 删除AI供应商配置

**接口**: `DELETE /api/system/providers/:id`  
**描述**: 删除AI供应商配置  
**权限**: 需要Bearer Token；管理员或超级管理员

### 解析格式配置

#### 1. 获取知识库解析格式

**接口**: `GET /api/system/knowledge-format`  
**描述**: 获取知识库解析格式配置  
**权限**: 需要Bearer Token；管理员或超级管理员

#### 2. 保存知识库解析格式

**接口**: `POST /api/system/knowledge-format`  
**描述**: 保存知识库解析格式（请求体为任意JSON结构）  
**权限**: 需要Bearer Token；管理员或超级管理员

#### 3. 获取题库解析格式

**接口**: `GET /api/system/question-parse-format`  
**描述**: 获取题库解析格式配置  
**权限**: 需要Bearer Token；管理员或超级管理员

#### 4. 保存题库解析格式

**接口**: `POST /api/system/question-parse-format`  
**描述**: 保存题库解析格式（请求体为任意JSON结构）  
**权限**: 需要Bearer Token；管理员或超级管理员

---

## 📋 数据模型

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

### QuestionBank (题库)

```json
{
  "id": "number",
  "name": "string",
  "description": "string",
  "file_type": "string",      // 'question_bank' | 'knowledge_base'
  "file_original_name": "string",
  "file_path": "string",
  "file_size": "number",
  "parse_status": "string",   // 'pending' | 'parsing' | 'completed' | 'failed'
  "provider_id": "number",
  "model_name": "string",
  "created_by": "number",
  "created_at": "string",
  "updated_at": "string"
}
```

### ParseResult (解析结果)

```json
{
  "id": "number",
  "bank_id": "number",
  "questions": "array",       // JSON数组，存储所有题目
  "total_questions": "number",
  "created_at": "string",
  "updated_at": "string"
}
```

### UserProgress (用户学习进度)

```json
{
  "id": "number",
  "user_id": "number",
  "bank_id": "number",
  "parse_result_id": "number",
  "current_question_index": "number",
  "completed_count": "number",
  "total_questions": "number",
  "last_study_time": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

---

## 🔧 使用示例

### 微信小程序登录流程

```javascript
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
      wx.setStorageSync('accessToken', accessToken);
    }
  }
});
```

### 普通用户注册和登录

```javascript
// 注册
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    password: 'MyPassword123',
    nickname: '测试用户'
  })
});

// 登录
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    password: 'MyPassword123'
  })
});
```

### 文件上传和AI解析

```javascript
// 1. 上传文件
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', '数学题库');
formData.append('description', '高中数学题库');

const uploadResponse = await fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const fileData = await uploadResponse.json();
const fileId = fileData.data.id;

// 2. 获取AI供应商列表
const providersResponse = await fetch('/api/system/providers?status=1', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 3. 开始AI解析
await fetch(`/api/files/${fileId}/parse`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    providerId: 1,
    modelName: 'gpt-4-turbo'
  })
});

// 4. 查询解析状态
const statusResponse = await fetch(`/api/files/${fileId}/parse-status`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 用户学习进度使用

```javascript
// 1. 进入题库页面，获取学习进度
const bankId = 2;
const progressResponse = await fetch(`/api/user-progress/${bankId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const progress = await progressResponse.json();

if (progress.data) {
  // 有进度，跳转到上次学习位置
  currentIndex = progress.data.current_question_index;
} else {
  // 无进度，从头开始
  currentIndex = 0;
}

// 2. 答题后保存进度
await fetch(`/api/user-progress/${bankId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    current_question_index: currentIndex + 1,
    completed_count: currentIndex + 1,
    total_questions: 50
  })
});
```

---

## 📞 技术支持

如遇到问题，请检查：
1. 请求格式是否正确
2. 认证Token是否有效
3. 服务器日志中的详细错误信息
4. 网络连接是否正常

**注意**: 
- 所有需要认证的接口都需要在请求头中包含有效的Bearer Token
- Token有效期为2小时，过期后需要使用refresh token刷新
- 生产环境建议启用HTTPS加密传输

---

**最后更新**: 2025-10-26  
**维护者**: Development Team  
**版本**: v2.0
