# 用户学习进度管理 API 接口文档

## 版本信息
- **版本号**: v1.0
- **创建日期**: 2025-10-26
- **基础URL**: `/api/user-progress`

## 概述

用户学习进度管理接口用于记录和追踪用户在各个题库中的学习情况，包括当前学习到的题目位置、完成进度等，实现断点续学功能。

**核心功能**：
- ✅ 记录用户在每个题库的学习进度
- ✅ 自动跳转到上次学习位置
- ✅ 查看学习进度和完成率
- ✅ 获取最近学习的题库
- ✅ 重置进度重新开始

---

## 数据表结构

### user_study_progress 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键 |
| user_id | INT | 用户ID（外键） |
| bank_id | INT | 题库ID（外键） |
| parse_result_id | INT | 解析结果ID（外键，可空） |
| current_question_index | INT | 当前题目索引（从0开始） |
| completed_count | INT | 已完成题目数量 |
| total_questions | INT | 总题目数量 |
| last_study_time | DATETIME | 最后学习时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**唯一约束**: `(user_id, bank_id)` - 每个用户在每个题库只有一条进度记录

---

## 接口列表

### 1. 获取用户在指定题库的学习进度

#### 接口信息
- **路径**: `GET /api/user-progress/:bankId`
- **描述**: 获取当前用户在指定题库的学习进度，用于实现断点续学
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| bankId | number | path | 是 | 题库ID |

#### 请求示例
```bash
GET /api/user-progress/2
Authorization: Bearer <your_token>
```

#### 响应示例

**有进度记录时**:
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
    "created_at": "2025-10-25 10:00:00",
    "updated_at": "2025-10-26 14:30:00",
    "bank_name": "前端开发题库",
    "file_name": "frontend_questions.pdf",
    "progress_percentage": 30
  }
}
```

**无进度记录时**:
```json
{
  "code": 200,
  "message": "暂无学习进度",
  "data": null
}
```

---

### 2. 获取用户所有学习进度

#### 接口信息
- **路径**: `GET /api/user-progress`
- **描述**: 获取当前用户在所有题库的学习进度列表
- **权限**: 需要登录

#### 请求示例
```bash
GET /api/user-progress
Authorization: Bearer <your_token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取所有学习进度成功",
  "data": [
    {
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
    },
    {
      "id": 2,
      "user_id": 10,
      "bank_id": 3,
      "current_question_index": 45,
      "completed_count": 45,
      "total_questions": 100,
      "last_study_time": "2025-10-25 16:20:00",
      "bank_name": "后端开发题库",
      "file_name": "backend_questions.pdf",
      "progress_percentage": 45
    }
  ]
}
```

---

### 3. 保存/更新学习进度 ⭐ 核心接口

#### 接口信息
- **路径**: `POST /api/user-progress/:bankId`
- **描述**: 保存或更新用户在指定题库的学习进度
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| bankId | number | path | 是 | 题库ID |
| parse_result_id | number | body | 否 | 解析结果ID |
| current_question_index | number | body | 是 | 当前题目索引（从0开始） |
| completed_count | number | body | 否 | 已完成题目数量 |
| total_questions | number | body | 是 | 总题目数量 |

#### 请求示例
```bash
POST /api/user-progress/2
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "parse_result_id": 5,
  "current_question_index": 20,
  "completed_count": 20,
  "total_questions": 50
}
```

#### 响应示例
```json
{
  "code": 200,
  "message": "保存学习进度成功",
  "data": {
    "id": 1,
    "user_id": 10,
    "bank_id": 2,
    "parse_result_id": 5,
    "current_question_index": 20,
    "completed_count": 20,
    "total_questions": 50,
    "last_study_time": "2025-10-26 15:00:00",
    "bank_name": "前端开发题库",
    "file_name": "frontend_questions.pdf",
    "progress_percentage": 40
  }
}
```

---

### 4. 获取最近学习的题库

#### 接口信息
- **路径**: `GET /api/user-progress/recent`
- **描述**: 获取用户最近学习的题库列表，按学习时间倒序
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 默认值 | 说明 |
|--------|------|------|------|--------|------|
| limit | number | query | 否 | 5 | 返回数量 |

#### 请求示例
```bash
GET /api/user-progress/recent?limit=3
Authorization: Bearer <your_token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "获取最近学习题库成功",
  "data": [
    {
      "id": 1,
      "user_id": 10,
      "bank_id": 2,
      "current_question_index": 20,
      "completed_count": 20,
      "total_questions": 50,
      "last_study_time": "2025-10-26 15:00:00",
      "bank_name": "前端开发题库",
      "progress_percentage": 40
    },
    {
      "id": 2,
      "user_id": 10,
      "bank_id": 3,
      "current_question_index": 45,
      "completed_count": 45,
      "total_questions": 100,
      "last_study_time": "2025-10-25 16:20:00",
      "bank_name": "后端开发题库",
      "progress_percentage": 45
    }
  ]
}
```

---

### 5. 重置题库学习进度

#### 接口信息
- **路径**: `DELETE /api/user-progress/:bankId`
- **描述**: 删除用户在指定题库的学习进度，重新开始
- **权限**: 需要登录

#### 请求参数
| 参数名 | 类型 | 位置 | 必填 | 说明 |
|--------|------|------|------|------|
| bankId | number | path | 是 | 题库ID |

#### 请求示例
```bash
DELETE /api/user-progress/2
Authorization: Bearer <your_token>
```

#### 响应示例
```json
{
  "code": 200,
  "message": "重置学习进度成功",
  "data": null
}
```

---

## 使用场景示例

### 场景1: 用户进入题库，自动跳转到上次学习位置

```javascript
async function enterQuestionBank(bankId) {
  // 1. 获取学习进度
  const response = await fetch(`/api/user-progress/${bankId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  
  if (result.data) {
    // 有进度记录，跳转到上次位置
    const { current_question_index, progress_percentage } = result.data;
    console.log(`继续学习，进度: ${progress_percentage}%`);
    
    // 跳转到指定题目
    navigateToQuestion(current_question_index);
  } else {
    // 无进度记录，从第一题开始
    console.log('开始新的学习');
    navigateToQuestion(0);
  }
}
```

### 场景2: 做完一道题后，更新进度

```javascript
async function onQuestionCompleted(bankId, currentIndex, totalCount) {
  await fetch(`/api/user-progress/${bankId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      current_question_index: currentIndex + 1, // 下一题的索引
      completed_count: currentIndex + 1,        // 已完成数量
      total_questions: totalCount
    })
  });
  
  console.log(`进度已保存: ${currentIndex + 1}/${totalCount}`);
}
```

### 场景3: 显示"继续学习"功能

```javascript
async function showRecentStudy() {
  const response = await fetch('/api/user-progress/recent?limit=3', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  
  // 显示最近学习的题库卡片
  result.data.forEach(progress => {
    console.log(`${progress.bank_name}: ${progress.progress_percentage}% 完成`);
    console.log(`上次学习: ${progress.last_study_time}`);
  });
}
```

### 场景4: 重新开始学习

```javascript
async function restartBank(bankId) {
  if (confirm('确定要重置进度，重新开始吗？')) {
    await fetch(`/api/user-progress/${bankId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('进度已重置');
    // 跳转到第一题
    navigateToQuestion(0);
  }
}
```

---

## 前端集成建议

### 1. 进入题库页面时

```javascript
// 1. 先获取题库的解析结果
const parseResult = await getParseResult(bankId);

// 2. 获取学习进度
const progress = await getUserProgress(bankId);

// 3. 判断跳转位置
if (progress && progress.current_question_index < parseResult.total_questions) {
  // 跳转到上次位置
  currentIndex = progress.current_question_index;
} else {
  // 从头开始
  currentIndex = 0;
}
```

### 2. 答题过程中实时保存

```javascript
// 建议: 每答完一题就保存一次进度
function onAnswerSubmit() {
  // 验证答案...
  
  // 保存进度
  saveProgress(bankId, {
    current_question_index: currentIndex + 1,
    completed_count: completedCount + 1,
    total_questions: totalQuestions
  });
  
  // 跳转下一题
  currentIndex++;
}
```

### 3. 显示进度条

```javascript
const progress = await getUserProgress(bankId);
if (progress) {
  const percentage = progress.progress_percentage;
  updateProgressBar(percentage);
}
```

---

## 数据字段说明

### progress_percentage (进度百分比)
- **计算公式**: `(completed_count / total_questions) * 100`
- **四舍五入**: 保留整数
- **范围**: 0-100

### current_question_index (当前题目索引)
- **起始值**: 0（第一题）
- **更新时机**: 每答完一题后加1
- **特殊情况**: 如果等于total_questions，表示已完成所有题目

---

## 错误处理

### 常见错误

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 参数错误 | 检查必填参数 |
| 401 | 未认证 | 检查Token |
| 404 | 进度不存在 | 创建新进度记录 |
| 500 | 服务器错误 | 查看日志 |

---

## 注意事项

1. **唯一性约束**: 每个用户在每个题库只有一条进度记录
2. **自动更新**: `last_study_time` 和 `updated_at` 会自动更新
3. **级联删除**: 删除用户或题库时，相关进度记录也会被删除
4. **索引优化**: 已建立 `user_id`、`bank_id`、`last_study_time` 索引
5. **并发安全**: 使用唯一约束防止重复记录

---

## 测试清单

- [ ] 首次进入题库（无进度）
- [ ] 再次进入题库（有进度）
- [ ] 更新学习进度
- [ ] 查看所有进度列表
- [ ] 查看最近学习的题库
- [ ] 重置进度
- [ ] 进度百分比计算正确
- [ ] 完成所有题目后的处理

---

## 更新日志

### v1.0 (2025-10-26)
- ✅ 首次发布用户学习进度功能
- ✅ 支持断点续学
- ✅ 支持进度统计
- ✅ 支持最近学习查询
- ✅ 支持进度重置

---

**文档创建时间**: 2025-10-26  
**测试状态**: 待测试  
**部署状态**: 待部署

