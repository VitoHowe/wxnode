# 解析结果管理 API 接口文档

## 版本信息
- **版本号**: v3.1
- **更新日期**: 2025-10-26
- **基础URL**: `/api/parse-results`

## 概述

解析结果管理接口用于查询、管理和统计AI解析文件后生成的题目数据。每次文件解析会创建一条解析结果记录，包含该次解析的所有题目信息。

## 通用说明

### 认证方式
所有接口都需要在请求头中携带 JWT Token：
```
Authorization: Bearer <your_token>
```

### 响应格式
所有接口统一返回以下格式：
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {...}
}
```

### 状态码说明
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或Token无效 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 接口列表

### 1. 获取解析结果列表

#### 接口信息
- **路径**: `GET /api/parse-results`
- **描述**: 分页查询解析结果列表，支持按题库ID筛选
- **权限**: 需要登录

#### 请求参数

**Query Parameters**

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| bank_id | number | 否 | - | 题库ID，用于筛选特定题库的解析结果 |
| page | number | 否 | 1 | 页码，从1开始 |
| limit | number | 否 | 20 | 每页数量，范围: 1-100 |

#### 请求示例

```bash
# 获取所有解析结果（第1页，每页20条）
GET /api/parse-results?page=1&limit=20

# 获取指定题库的解析结果
GET /api/parse-results?bank_id=1&page=1&limit=10

# 获取第2页
GET /api/parse-results?page=2&limit=20
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
            "explanation": "JavaScript有7种基本数据类型，String是其中之一",
            "difficulty": 1,
            "tags": ["JavaScript", "数据类型"]
          },
          {
            "type": "multiple",
            "content": "以下哪些是前端框架？",
            "options": ["React", "Vue", "Angular", "Django"],
            "answer": "ABC",
            "explanation": "Django是Python后端框架，其他都是前端框架",
            "difficulty": 2,
            "tags": ["前端", "框架"]
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

#### 字段说明

**ParseResult 对象**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | number | 解析结果ID |
| bank_id | number | 关联的题库ID |
| questions | array | 题目数组（详见下方） |
| total_questions | number | 题目总数 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |
| bank_name | string | 题库名称 |
| file_name | string | 原始文件名 |

**Question 对象**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| type | string | 题目类型: single(单选), multiple(多选), judge(判断), fill(填空), essay(问答) |
| content | string | 题目内容 |
| options | array | 选项数组（单选、多选题有此字段） |
| answer | string | 答案 |
| explanation | string | 解析说明 |
| difficulty | number | 难度等级: 1(简单), 2(中等), 3(困难) |
| tags | array | 标签数组 |
| page_number | number | 页码（可选） |
| confidence_score | number | AI置信度分数（可选，0-1之间） |

---

### 2. 获取单个解析结果详情

#### 接口信息
- **路径**: `GET /api/parse-results/:id`
- **描述**: 根据ID获取解析结果的完整信息
- **权限**: 需要登录

#### 请求参数

**Path Parameters**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 解析结果ID |

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
    "questions": [
      {
        "type": "single",
        "content": "以下哪个是JavaScript的数据类型？",
        "options": ["String", "Integer", "Float", "Char"],
        "answer": "A",
        "explanation": "JavaScript有7种基本数据类型，String是其中之一",
        "difficulty": 1,
        "tags": ["JavaScript", "数据类型"],
        "page_number": 1,
        "confidence_score": 0.95
      }
    ],
    "total_questions": 50,
    "created_at": "2025-10-26 10:30:45",
    "updated_at": "2025-10-26 10:30:45",
    "bank_name": "前端开发题库",
    "file_name": "frontend_questions.pdf"
  }
}
```

#### 错误响应

```json
{
  "code": 404,
  "message": "解析结果不存在",
  "data": null
}
```

---

### 3. 获取题库的所有解析结果

#### 接口信息
- **路径**: `GET /api/parse-results/bank/:bankId`
- **描述**: 获取指定题库的所有解析结果历史记录
- **权限**: 需要登录

#### 请求参数

**Path Parameters**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bankId | number | 是 | 题库ID |

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
      "updated_at": "2025-10-26 15:20:30",
      "bank_name": "前端开发题库",
      "file_name": "frontend_questions_v2.pdf"
    },
    {
      "id": 5,
      "bank_id": 2,
      "questions": [...],
      "total_questions": 50,
      "created_at": "2025-10-26 10:30:45",
      "updated_at": "2025-10-26 10:30:45",
      "bank_name": "前端开发题库",
      "file_name": "frontend_questions.pdf"
    }
  ]
}
```

#### 说明
- 结果按创建时间倒序排列（最新的在前）
- 返回该题库的所有历史解析记录
- 可用于版本对比和历史追溯

---

### 4. 获取题库的解析统计信息

#### 接口信息
- **路径**: `GET /api/parse-results/bank/:bankId/stats`
- **描述**: 获取指定题库的统计信息，包括解析次数、题目总数、最后解析时间等
- **权限**: 需要登录

#### 请求参数

**Path Parameters**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bankId | number | 是 | 题库ID |

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

#### 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| parse_count | number | 解析次数（该题库被解析的总次数） |
| total_questions | number | 题目总数（所有解析结果的题目数量总和） |
| last_parse_time | string | 最后解析时间 |

---

### 5. 删除解析结果

#### 接口信息
- **路径**: `DELETE /api/parse-results/:id`
- **描述**: 删除指定的解析结果记录
- **权限**: 需要登录

#### 请求参数

**Path Parameters**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 解析结果ID |

#### 请求示例

```bash
DELETE /api/parse-results/5
```

#### 响应示例

**成功响应**
```json
{
  "code": 200,
  "message": "删除解析结果成功",
  "data": null
}
```

**错误响应**
```json
{
  "code": 404,
  "message": "解析结果不存在",
  "data": null
}
```

---

## 数据模型

### parse_results 表结构

| 字段名 | 类型 | 是否必填 | 说明 |
|--------|------|----------|------|
| id | INT | 是 | 主键，自增 |
| bank_id | INT | 是 | 关联的题库ID（外键） |
| questions | JSON | 是 | 题目数组，JSON格式 |
| total_questions | INT | 是 | 题目总数 |
| created_at | DATETIME | 是 | 创建时间 |
| updated_at | DATETIME | 是 | 更新时间 |

### 关联关系

```
question_banks (题库表)
    ↓ (1:N)
parse_results (解析结果表)
```

- 一个题库可以有多个解析结果（多次解析）
- 删除题库时，会级联删除所有关联的解析结果

---

## 使用场景示例

### 场景1: 查看某个题库的所有解析历史

```javascript
// 1. 先获取题库的解析统计
const statsResponse = await fetch('/api/parse-results/bank/2/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const stats = await statsResponse.json();
console.log(`该题库已解析 ${stats.data.parse_count} 次`);

// 2. 获取所有解析记录
const resultsResponse = await fetch('/api/parse-results/bank/2', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const results = await resultsResponse.json();
console.log('解析历史:', results.data);
```

### 场景2: 分页浏览所有解析结果

```javascript
// 获取第1页数据
const page1 = await fetch('/api/parse-results?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await page1.json();
console.log(`总共 ${data.data.pagination.total} 条记录`);
console.log(`共 ${data.data.pagination.totalPages} 页`);
```

### 场景3: 查看具体题目内容

```javascript
// 1. 获取解析结果
const response = await fetch('/api/parse-results/5', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const result = await response.json();

// 2. 遍历题目
result.data.questions.forEach((q, index) => {
  console.log(`题目 ${index + 1}: ${q.content}`);
  console.log(`答案: ${q.answer}`);
  console.log(`解析: ${q.explanation}`);
});
```

### 场景4: 清理旧的解析记录

```javascript
// 1. 获取题库的所有解析记录
const results = await fetch('/api/parse-results/bank/2', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(r => r.json());

// 2. 保留最新的3条，删除其他的
const toDelete = results.data.slice(3);
for (const item of toDelete) {
  await fetch(`/api/parse-results/${item.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

---

## 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 401 | Token无效或过期 | 重新登录获取新Token |
| 404 | 解析结果不存在 | 检查ID是否正确 |
| 500 | 服务器错误 | 联系管理员或查看错误日志 |

---

## 注意事项

1. **JSON解析**: `questions` 字段存储为JSON格式，后端会自动解析为数组返回
2. **分页限制**: `limit` 参数最大为100，超出会被限制为100
3. **级联删除**: 删除题库时会自动删除所有关联的解析结果
4. **历史追溯**: 同一题库的多次解析会保留所有记录，便于版本对比
5. **数据完整性**: 解析结果创建后不支持修改，保证数据完整性
6. **路由匹配**: `/bank/:bankId` 路由优先于 `/:id` 匹配，避免冲突

---

## 更新日志

### v3.1 (2025-10-26)
- 修复路由匹配冲突问题
- 优化路由顺序，`/bank/:bankId` 系列路由优先匹配
- 添加正则表达式限制ID参数只匹配数字
- 完善接口文档和使用示例

### v3.0 (2025-10-19)
- 首次发布解析结果管理接口
- 支持解析结果的增删查改
- 支持按题库筛选和统计

---

## 联系与支持

如有问题或建议，请联系开发团队或提交Issue。

