# 微信小程序题库管理系统 API 接口文档

## 📖 项目概述

### 基本信息
- **项目名称**: 微信小程序题库管理后端系统
- **版本**: v1.0.0
- **基础URL**: `http://localhost:3000/api`
- **文档类型**: RESTful API
- **支持格式**: JSON

### 技术栈
- **运行环境**: Node.js + TypeScript
- **Web框架**: Express.js
- **数据库**: MySQL + Redis
- **认证方式**: JWT (JSON Web Token)
- **文档工具**: Swagger/OpenAPI 3.0
- **日志系统**: Winston

### 特色功能
- ✅ 微信小程序登录集成
- ✅ PDF题库文件智能解析
- ✅ 分层权限控制系统
- ✅ 完整的CRUD操作支持
- ✅ 分页查询和搜索功能
- ✅ 实时解析状态追踪

---

## 🔧 通用规范

### 认证方式

本API使用JWT Bearer Token认证方式。

**请求头格式**:
```http
Authorization: Bearer {your_access_token}
```

**Token类型**:
- `Access Token`: 用于接口访问认证，有效期较短
- `Refresh Token`: 用于刷新Access Token，有效期较长

### 统一响应格式

所有API响应都采用统一的JSON格式：

```json
{
  "code": 200,
  "message": "操作描述信息",
  "data": {} | [] | null,
  "errors": [] // 仅在验证失败时出现
}
```

### HTTP状态码

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 200 | 成功 | 请求处理成功 |
| 400 | 请求参数错误 | 参数验证失败、格式错误 |
| 401 | 未认证 | Token无效或已过期 |
| 403 | 权限不足 | 无对应操作权限 |
| 404 | 资源不存在 | 请求的资源未找到 |
| 500 | 服务器内部错误 | 系统异常 |

### 分页参数

支持分页的接口统一使用以下查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码，从1开始 |
| limit | integer | 20 | 每页数量，最大100 |

**分页响应格式**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 🔐 认证模块 (Auth)

### 1. 微信小程序登录

**接口地址**: `POST /api/auth/login`

**描述**: 使用微信小程序code进行登录认证

**请求参数**:
```json
{
  "code": "string (必需) - 微信小程序wx.login获取的code",
  "encryptedData": "string (可选) - 加密的用户信息",
  "iv": "string (可选) - 初始向量",
  "signature": "string (可选) - 数据签名"
}
```

**成功响应示例**:
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
      "openid": "oxxxxxxxxxxx",
      "nickname": "微信用户",
      "avatar_url": "https://thirdwx.qlogo.cn/mmopen/...",
      "phone": null,
      "role_id": 2,
      "status": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. 刷新访问令牌

**接口地址**: `POST /api/auth/refresh`

**描述**: 使用刷新令牌获取新的访问令牌

**请求参数**:
```json
{
  "refreshToken": "string (必需) - 刷新令牌"
}
```

**成功响应示例**:
```json
{
  "code": 200,
  "message": "令牌刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "2h"
  }
}
```

### 3. 获取用户信息

**接口地址**: `GET /api/auth/profile`

**认证**: Bearer Token

**描述**: 获取当前登录用户的详细信息

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "openid": "oxxxxxxxxxxx",
    "nickname": "微信用户",
    "avatar_url": "https://thirdwx.qlogo.cn/mmopen/...",
    "phone": "13800138000",
    "role_id": 2,
    "status": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. 更新用户信息

**接口地址**: `PUT /api/auth/profile`

**认证**: Bearer Token

**描述**: 更新当前登录用户的信息

**请求参数**:
```json
{
  "nickname": "string (可选) - 昵称，最大50字符",
  "avatar_url": "string (可选) - 头像URL",
  "phone": "string (可选) - 手机号，格式：1[3-9]xxxxxxxxx"
}
```

**成功响应示例**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": 1,
    "openid": "oxxxxxxxxxxx",
    "nickname": "新昵称",
    "avatar_url": "https://example.com/avatar.jpg",
    "phone": "13800138000",
    "role_id": 2,
    "status": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### 5. 用户登出

**接口地址**: `POST /api/auth/logout`

**认证**: Bearer Token

**描述**: 登出当前用户，使令牌失效

**成功响应示例**:
```json
{
  "code": 200,
  "message": "登出成功",
  "data": null
}
```

---

## 👥 用户管理模块 (Users)

> **权限要求**: 所有用户管理接口都需要管理员权限

### 1. 获取用户列表

**接口地址**: `GET /api/users`

**认证**: Bearer Token (管理员)

**描述**: 获取系统中的用户列表，支持搜索和分页

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码 |
| limit | integer | 20 | 每页数量 |
| keyword | string | - | 搜索关键词 |

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "openid": "oxxxxxxxxxxx",
        "nickname": "用户A",
        "avatar_url": "https://example.com/avatar1.jpg",
        "phone": "13800138000",
        "role_id": 2,
        "status": 1,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### 2. 获取用户详情

**接口地址**: `GET /api/users/{id}`

**认证**: Bearer Token

**描述**: 根据用户ID获取用户详细信息

**路径参数**:
- `id`: integer (必需) - 用户ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "openid": "oxxxxxxxxxxx",
    "nickname": "用户A",
    "avatar_url": "https://example.com/avatar1.jpg",
    "phone": "13800138000",
    "role_id": 2,
    "status": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. 更新用户信息

**接口地址**: `PUT /api/users/{id}`

**认证**: Bearer Token (管理员)

**描述**: 更新指定用户的信息

**路径参数**:
- `id`: integer (必需) - 用户ID

**请求参数**:
```json
{
  "nickname": "string (可选) - 昵称",
  "role_id": "integer (可选) - 角色ID",
  "status": "integer (可选) - 状态：0-禁用，1-启用"
}
```

**成功响应示例**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": 1,
    "openid": "oxxxxxxxxxxx",
    "nickname": "新昵称",
    "avatar_url": "https://example.com/avatar1.jpg",
    "phone": "13800138000",
    "role_id": 2,
    "status": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### 4. 删除用户

**接口地址**: `DELETE /api/users/{id}`

**认证**: Bearer Token (管理员)

**描述**: 删除指定用户

**路径参数**:
- `id`: integer (必需) - 用户ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

---

## 📚 题库管理模块 (Questions)

### 1. 获取题目列表

**接口地址**: `GET /api/questions`

**认证**: Bearer Token

**描述**: 获取题库中的题目列表，支持多条件筛选和分页

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| bank_id | integer | - | 题库ID筛选 |
| type | string | - | 题目类型：single/multiple/judge/fill/essay |
| difficulty | integer | - | 难度等级：1-简单，2-中等，3-困难 |
| keyword | string | - | 关键词搜索 |
| page | integer | 1 | 页码 |
| limit | integer | 20 | 每页数量 |

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "questions": [
      {
        "id": 1,
        "bank_id": 1,
        "type": "single",
        "content": "以下哪个是JavaScript的数据类型？",
        "options": [
          "String",
          "Integer", 
          "Float",
          "Char"
        ],
        "answer": "String",
        "explanation": "JavaScript基本数据类型包括String、Number、Boolean等",
        "difficulty": 1,
        "tags": ["JavaScript", "基础"],
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 2. 获取题目详情

**接口地址**: `GET /api/questions/{id}`

**认证**: Bearer Token

**描述**: 根据题目ID获取详细信息

**路径参数**:
- `id`: integer (必需) - 题目ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "bank_id": 1,
    "type": "single",
    "content": "以下哪个是JavaScript的数据类型？",
    "options": [
      "String",
      "Integer", 
      "Float",
      "Char"
    ],
    "answer": "String",
    "explanation": "JavaScript基本数据类型包括String、Number、Boolean等",
    "difficulty": 1,
    "tags": ["JavaScript", "基础"],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. 获取题库列表

**接口地址**: `GET /api/questions/banks`

**认证**: Bearer Token

**描述**: 获取所有可用的题库列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码 |
| limit | integer | 20 | 每页数量 |

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "JavaScript基础题库",
        "description": "包含JavaScript基础知识的题目集合",
        "question_count": 150,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### 4. 获取题库详情

**接口地址**: `GET /api/questions/banks/{id}`

**认证**: Bearer Token

**描述**: 根据题库ID获取详细信息和统计数据

**路径参数**:
- `id`: integer (必需) - 题库ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "name": "JavaScript基础题库",
    "description": "包含JavaScript基础知识的题目集合",
    "question_count": 150,
    "statistics": {
      "single": 80,
      "multiple": 30,
      "judge": 25,
      "fill": 10,
      "essay": 5,
      "difficulty": {
        "1": 60,
        "2": 60,
        "3": 30
      }
    },
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. 更新题目

**接口地址**: `PUT /api/questions/{id}`

**认证**: Bearer Token

**描述**: 更新指定题目的信息

**路径参数**:
- `id`: integer (必需) - 题目ID

**请求参数**:
```json
{
  "content": "string (可选) - 题目内容",
  "options": "array (可选) - 选项（选择题）",
  "answer": "string (可选) - 答案",
  "explanation": "string (可选) - 解析",
  "difficulty": "integer (可选) - 难度等级：1-3",
  "tags": "array (可选) - 标签"
}
```

**成功响应示例**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": 1,
    "bank_id": 1,
    "type": "single",
    "content": "更新后的题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "answer": "选项A",
    "explanation": "更新后的解析",
    "difficulty": 2,
    "tags": ["JavaScript", "进阶"],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### 6. 删除题目

**接口地址**: `DELETE /api/questions/{id}`

**认证**: Bearer Token

**描述**: 删除指定的题目

**路径参数**:
- `id`: integer (必需) - 题目ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

---

## 📁 文件管理模块 (Files)

### 1. 上传题库文件

**接口地址**: `POST /api/files/upload`

**认证**: Bearer Token

**描述**: 上传PDF格式的题库文件

**请求格式**: `multipart/form-data`

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| file | file | 是 | PDF文件，最大50MB |
| name | string | 是 | 题库名称 |
| description | string | 否 | 题库描述 |

**成功响应示例**:
```json
{
  "code": 200,
  "message": "文件上传成功",
  "data": {
    "id": 1,
    "name": "JavaScript基础题库",
    "description": "包含JavaScript基础知识的题目",
    "filename": "file-1640995200000-123456789.pdf",
    "original_name": "javascript-questions.pdf",
    "file_size": 2048576,
    "file_path": "/uploads/file-1640995200000-123456789.pdf",
    "mime_type": "application/pdf",
    "status": "pending",
    "user_id": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. 获取文件列表

**接口地址**: `GET /api/files`

**认证**: Bearer Token

**描述**: 获取用户上传的文件列表

**查询参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码 |
| limit | integer | 20 | 每页数量 |
| status | string | - | 解析状态：pending/parsing/completed/failed |

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "JavaScript基础题库",
        "description": "包含JavaScript基础知识的题目",
        "filename": "file-1640995200000-123456789.pdf",
        "original_name": "javascript-questions.pdf",
        "file_size": 2048576,
        "status": "completed",
        "parsed_questions": 50,
        "user_id": 1,
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### 3. 获取文件详情

**接口地址**: `GET /api/files/{id}`

**认证**: Bearer Token

**描述**: 获取指定文件的详细信息

**路径参数**:
- `id`: integer (必需) - 文件ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "name": "JavaScript基础题库",
    "description": "包含JavaScript基础知识的题目",
    "filename": "file-1640995200000-123456789.pdf",
    "original_name": "javascript-questions.pdf",
    "file_size": 2048576,
    "file_path": "/uploads/file-1640995200000-123456789.pdf",
    "mime_type": "application/pdf",
    "status": "completed",
    "parsed_questions": 50,
    "error_message": null,
    "user_id": 1,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### 4. 解析文件

**接口地址**: `POST /api/files/{id}/parse`

**认证**: Bearer Token

**描述**: 启动文件解析任务

**路径参数**:
- `id`: integer (必需) - 文件ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "解析任务已启动",
  "data": {
    "id": 1,
    "status": "parsing",
    "message": "正在解析PDF文件，请稍后查询解析状态"
  }
}
```

### 5. 获取解析状态

**接口地址**: `GET /api/files/{id}/parse-status`

**认证**: Bearer Token

**描述**: 获取文件解析的当前状态和进度

**路径参数**:
- `id`: integer (必需) - 文件ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "file_id": 1,
    "status": "completed",
    "progress": 100,
    "parsed_questions": 50,
    "failed_questions": 2,
    "total_pages": 20,
    "current_page": 20,
    "error_message": null,
    "started_at": "2024-01-01T10:00:00.000Z",
    "completed_at": "2024-01-01T10:30:00.000Z"
  }
}
```

**解析状态说明**:
- `pending`: 待解析
- `parsing`: 解析中
- `completed`: 解析完成
- `failed`: 解析失败

### 6. 删除文件

**接口地址**: `DELETE /api/files/{id}`

**认证**: Bearer Token

**描述**: 删除指定的文件及其相关数据

**路径参数**:
- `id`: integer (必需) - 文件ID

**成功响应示例**:
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

---

## 📊 数据模型

### User (用户)
```typescript
{
  id: number;                 // 用户ID
  openid: string;            // 微信OpenID
  nickname?: string;         // 昵称
  avatar_url?: string;       // 头像URL
  phone?: string;            // 手机号
  role_id: number;           // 角色ID：1-管理员，2-普通用户
  status: number;            // 状态：0-禁用，1-启用
  created_at: Date;          // 创建时间
  updated_at: Date;          // 更新时间
}
```

### Question (题目)
```typescript
{
  id: number;                // 题目ID
  bank_id: number;           // 题库ID
  type: 'single' | 'multiple' | 'judge' | 'fill' | 'essay'; // 题目类型
  content: string;           // 题目内容
  options?: string[];        // 选项（选择题）
  answer: string;            // 答案
  explanation?: string;      // 解析
  difficulty: 1 | 2 | 3;     // 难度：1-简单，2-中等，3-困难
  tags?: string[];           // 标签
  created_at: Date;          // 创建时间
  updated_at: Date;          // 更新时间
}
```

### QuestionBank (题库)
```typescript
{
  id: number;                // 题库ID
  name: string;              // 题库名称
  description?: string;      // 题库描述
  question_count: number;    // 题目数量
  created_at: Date;          // 创建时间
  updated_at: Date;          // 更新时间
}
```

### File (文件)
```typescript
{
  id: number;                // 文件ID
  name: string;              // 文件名称
  description?: string;      // 文件描述
  filename: string;          // 存储文件名
  original_name: string;     // 原始文件名
  file_size: number;         // 文件大小（字节）
  file_path: string;         // 文件路径
  mime_type: string;         // MIME类型
  status: 'pending' | 'parsing' | 'completed' | 'failed'; // 解析状态
  parsed_questions?: number; // 已解析题目数
  error_message?: string;    // 错误信息
  user_id: number;           // 上传用户ID
  created_at: Date;          // 创建时间
  updated_at: Date;          // 更新时间
}
```

---

## 🚀 使用示例

### 完整的用户登录流程

```javascript
// 1. 微信小程序登录
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'wx_login_code_from_miniprogram'
  })
});

const loginData = await loginResponse.json();
console.log('登录成功:', loginData);

// 2. 使用Access Token访问需要认证的接口
const profileResponse = await fetch('/api/auth/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${loginData.data.accessToken}`
  }
});

// 3. Token过期时使用Refresh Token刷新
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: loginData.data.refreshToken
  })
});
```

### 文件上传和解析流程

```javascript
// 1. 上传PDF文件
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('name', '数学基础题库');
formData.append('description', '包含高中数学基础知识点');

const uploadResponse = await fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const uploadData = await uploadResponse.json();
const fileId = uploadData.data.id;

// 2. 启动解析任务
await fetch(`/api/files/${fileId}/parse`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 3. 轮询查询解析状态
const checkParseStatus = async () => {
  const statusResponse = await fetch(`/api/files/${fileId}/parse-status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const statusData = await statusResponse.json();
  
  if (statusData.data.status === 'completed') {
    console.log('解析完成，共解析题目:', statusData.data.parsed_questions);
  } else if (statusData.data.status === 'failed') {
    console.error('解析失败:', statusData.data.error_message);
  } else {
    // 继续轮询
    setTimeout(checkParseStatus, 5000);
  }
};

checkParseStatus();
```

### 题目查询和筛选

```javascript
// 查询特定题库的中等难度单选题
const questionsResponse = await fetch('/api/questions?' + new URLSearchParams({
  bank_id: '1',
  type: 'single',
  difficulty: '2',
  page: '1',
  limit: '10'
}), {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const questionsData = await questionsResponse.json();
console.log('查询到的题目:', questionsData.data.questions);
console.log('分页信息:', questionsData.data.pagination);
```

---

## 🛠️ 开发者信息

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm start
```

### 环境配置

创建 `.env` 文件并配置以下环境变量：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wxnode_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=2h
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800
```

### API文档访问

- **Swagger UI**: `http://localhost:3000/api-docs`
- **健康检查**: `http://localhost:3000/health`

---

## 📝 更新日志

### v1.0.0 (2024-01-01)
- ✅ 完成微信小程序登录集成
- ✅ 实现用户管理系统
- ✅ 完成题库和题目CRUD功能
- ✅ 实现PDF文件上传和解析
- ✅ 添加JWT认证和权限控制
- ✅ 完善API文档和Swagger集成

---

**📚 文档最后更新**: 2024-01-01  
**🔧 技术支持**: 请通过GitHub Issues反馈问题  
**📄 许可证**: MIT License
