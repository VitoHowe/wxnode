# 微信小程序题库管理系统 API 接口文档

**版本**: v1.3.0  
**最后更新**: 2025-09-29  
**基础URL**: `http://localhost:3001/api`

## 📋 更新日志

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
7. **文件上传与解析**: 支持题库文件上传和智能解析
8. **详细日志记录**: 便于开发调试和生产监控
9. **系统配置管理**: 支持模型服务接入参数与解析模板集中维护

## ⚙️ 系统设置模块

### 模型配置

- **数据库表**: `model_configs`
  - `name` 模型名称（唯一）
  - `endpoint` 模型服务地址
  - `api_key` 模型密钥
  - `description` 描述信息（可空）
  - `status` 是否启用（1:启用 0:停用）

#### GET /api/system/models
- **功能**：获取全部模型配置列表
- **权限**：需要 Bearer Token；管理员或超级管理员
- **响应示例**：
```json
{
  "code": 200,
  "message": "获取模型配置成功",
  "data": [
    {
      "id": 1,
      "name": "gpt-4-turbo",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "api_key": "sk-********",
      "description": "OpenAI GPT-4 Turbo",
      "status": 1,
      "created_at": "2025-09-29 12:00:00",
      "updated_at": "2025-09-29 12:00:00"
    }
  ],
  "timestamp": "2025-09-29T09:10:00.123Z"
}
```

#### POST /api/system/models
- **功能**：新增模型配置
- **权限**：需要 Bearer Token；管理员或超级管理员
- **请求体**：
```json
{
  "name": "gpt-4-turbo",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "api_key": "sk-********",
  "description": "OpenAI模型",
  "status": 1
}
```
- **响应**：返回创建后的完整模型配置

#### PUT /api/system/models/{id}
- **功能**：更新模型配置
- **权限**：需要 Bearer Token；管理员或超级管理员
- **说明**：请求体至少包含一个可更新字段；`description` 允许传空串清空描述

#### DELETE /api/system/models/{id}
- **功能**：删除模型配置
- **权限**：需要 Bearer Token；管理员或超级管理员

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
