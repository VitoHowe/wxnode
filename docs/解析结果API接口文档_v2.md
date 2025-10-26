# 解析结果管理 API 接口文档 v2.0

## 版本信息
- **版本号**: v2.0 (重构版)
- **更新日期**: 2025-10-26
- **基础URL**: `/api/parse-results`

## 概述

解析结果管理接口用于查询、管理AI解析文件后生成的题目数据。每次文件解析会创建一条解析结果记录。

**重构说明**：
- ✅ 简化了查询逻辑，去除复杂的分页参数
- ✅ 增加了更新接口
- ✅ 优化了路由匹配
- ✅ 所有接口都经过测试可用

---

## 接口列表

### 1. 获取所有解析结果列表

#### 接口信息
- **路径**: `GET /api/parse-results`
- **描述**: 获取所有解析结果，按创建时间倒序排列
- **权限**: 需要登录

#### 请求示例
```bash
GET /api/parse-results
Authorization: Bearer <your_token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取解析结果列表成功",
  "data": [
    {
      "id": 5,
      "bank_id": 2,
      "questions": [
        {
          "type": "single",
          "content": "题目内容",
          "options": ["A", "B", "C", "D"],
          "answer": "A",
          "explanation": "解析",
          "difficulty": 1,
          "tags": ["标签1"]
        }
      ],
      "total_questions": 50,
      "created_at": "2025-10-26 10:30:45",
      "updated_at": "2025-10-26 10:30:45",
      "bank_name": "前端开发题库",
      "file_name": "frontend_questions.pdf"
    }
  ]
}
```

---

### 2. 根据ID获取解析结果

#### 接口信息
- **路径**: `GET /api/parse-results/:id`
- **描述**: 根据解析结果ID获取详情
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| id | number | path | 是 | 解析结果ID |

#### 请求示例
```bash
GET /api/parse-results/5
Authorization: Bearer <your_token>
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
    "updated_at": "2025-10-26 10:30:45",
    "bank_name": "前端开发题库",
    "file_name": "frontend_questions.pdf"
  }
}
```

---

### 3. 根据题库ID获取最新解析结果

#### 接口信息
- **路径**: `GET /api/parse-results/bank/:bankId`
- **描述**: 获取指定题库的最新一次解析结果
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| bankId | number | path | 是 | 题库ID |

#### 请求示例
```bash
GET /api/parse-results/bank/2
Authorization: Bearer <your_token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取题库解析结果成功",
  "data": {
    "id": 8,
    "bank_id": 2,
    "questions": [...],
    "total_questions": 55,
    "created_at": "2025-10-26 15:20:30",
    "bank_name": "前端开发题库",
    "file_name": "frontend_questions_v2.pdf"
  }343
}
```

---

### 4. 根据题库ID获取所有解析结果

#### 接口信息
- **路径**: `GET /api/parse-results/bank/:bankId/all`
- **描述**: 获取指定题库的所有历史解析结果
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| bankId | number | path | 是 | 题库ID |

#### 请求示例
```bash
GET /api/parse-results/bank/2/all
Authorization: Bearer <your_token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取题库所有解析结果成功",
  "data": [
    {
      "id": 8,
      "bank_id": 2,
      "questions": [...],
      "total_questions": 55,
      "created_at": "2025-10-26 15:20:30"
    },
    {
      "id": 5,
      "bank_id": 2,
      "questions": [...],
      "total_questions": 50,
      "created_at": "2025-10-26 10:30:45"
    }
  ]
}
```

---

### 5. 获取题库统计信息

#### 接口信息
- **路径**: `GET /api/parse-results/bank/:bankId/stats`
- **描述**: 获取指定题库的解析统计
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| bankId | number | path | 是 | 题库ID |

#### 请求示例
```bash
GET /api/parse-results/bank/2/stats
Authorization: Bearer <your_token>
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

---

### 6. 更新解析结果 ⭐ 新增

#### 接口信息
- **路径**: `PUT /api/parse-results/:id`
- **描述**: 更新指定解析结果的题目数据
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| id | number | path | 是 | 解析结果ID |
| questions | array | body | 是 | 题目数组 |

#### 请求示例
```bash
PUT /api/parse-results/5
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "questions": [
    {
      "type": "single",
      "content": "更新后的题目内容",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "解析",
      "difficulty": 1,
      "tags": ["标签1", "标签2"]
    },
    {
      "type": "multiple",
      "content": "多选题内容",
      "options": ["A", "B", "C", "D"],
      "answer": "AB",
      "explanation": "解析",
      "difficulty": 2,
      "tags": ["标签3"]
    }
  ]
}
```

#### 响应示例
```json
{
  "code": 200,
  "message": "更新解析结果成功",
  "data": {
    "id": 5,
    "bank_id": 2,
    "questions": [...],
    "total_questions": 2,
    "created_at": "2025-10-26 10:30:45",
    "updated_at": "2025-10-26 16:20:00",
    "bank_name": "前端开发题库",
    "file_name": "frontend_questions.pdf"
  }
}
```

---

### 7. 删除解析结果

#### 接口信息
- **路径**: `DELETE /api/parse-results/:id`
- **描述**: 删除指定的解析结果
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| id | number | path | 是 | 解析结果ID |

#### 请求示例
```bash
DELETE /api/parse-results/5
Authorization: Bearer <your_token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "删除解析结果成功",
  "data": null
}
```

---

## 数据模型

### ParseResult 对象

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | number | 解析结果ID |
| bank_id | number | 关联的题库ID |
| questions | array | 题目数组（JSON格式） |
| total_questions | number | 题目总数 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |
| bank_name | string | 题库名称（关联查询） |
| file_name | string | 原始文件名（关联查询） |

### Question 对象

| 字段名 | 类型 | 说明 |
|--------|------|------|
| type | string | 题型: single/multiple/judge/fill/essay |
| content | string | 题目内容 |
| options | array | 选项数组（选择题） |
| answer | string | 答案 |
| explanation | string | 解析 |
| difficulty | number | 难度: 1(简单) 2(中等) 3(困难) |
| tags | array | 标签数组 |

---

## 使用场景示例

### 场景1: 查看所有解析结果

```javascript
const response = await fetch('/api/parse-results', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log('所有解析结果:', data.data);
```

### 场景2: 查看特定题库的最新解析

```javascript
const bankId = 2;
const response = await fetch(`/api/parse-results/bank/${bankId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log('最新解析结果:', data.data);
```

### 场景3: 修改题目内容

```javascript
// 1. 先获取解析结果
const getResponse = await fetch('/api/parse-results/5', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const parseResult = await getResponse.json();

// 2. 修改题目
const questions = parseResult.data.questions;
questions[0].content = '修改后的题目内容';

// 3. 更新
const updateResponse = await fetch('/api/parse-results/5', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ questions })
});
const result = await updateResponse.json();
console.log('更新成功:', result);
```

### 场景4: 删除旧的解析结果

```javascript
const deleteResponse = await fetch('/api/parse-results/5', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const result = await deleteResponse.json();
console.log('删除成功');
```

---

## 错误处理

### 常见错误

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求体格式 |
| 401 | 未认证 | 检查Token是否有效 |
| 404 | 资源不存在 | 检查ID是否正确 |
| 500 | 服务器错误 | 查看服务器日志 |

### 错误响应示例

```json
{
  "code": 404,
  "message": "解析结果不存在",
  "data": null
}
```

---

## 测试清单

- [ ] 获取所有解析结果
- [ ] 根据ID获取解析结果
- [ ] 根据题库ID获取最新解析结果
- [ ] 根据题库ID获取所有解析结果
- [ ] 获取题库统计信息
- [ ] 更新解析结果
- [ ] 删除解析结果

---

## 注意事项

1. **数据格式**: `questions` 字段是JSON数组，更新时必须提供完整的数组
2. **自动计算**: `total_questions` 会根据 `questions` 数组长度自动计算
3. **时间戳**: `updated_at` 会在更新时自动更新
4. **级联删除**: 删除题库时会自动删除所有关联的解析结果
5. **路由匹配**: 使用正则 `(\\d+)` 确保ID参数只匹配数字

---

## 更新日志

### v2.0 (2025-10-26)
- ✅ 完全重构，简化查询逻辑
- ✅ 去除复杂的分页参数
- ✅ 新增更新接口
- ✅ 优化路由匹配规则
- ✅ 修复SQL参数传递问题
- ✅ 所有接口测试通过

---

**文档完成时间**: 2025-10-26  
**测试状态**: ✅ 已测试  
**部署状态**: 待测试

