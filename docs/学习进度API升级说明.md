# 学习进度API升级说明

## 📋 升级概述

**升级日期**：2025-10-29  
**版本**：v2.0  
**目的**：支持章节级别的学习进度管理，配合单题模式API

---

## 🎯 升级背景

### 原有系统问题
1. ❌ 只支持**题库级别**进度（整个题库一个进度）
2. ❌ 使用 `current_question_index`（索引0,1,2...）而非题号（1,2,3...）
3. ❌ 无法记录用户在不同章节的学习进度
4. ❌ 无法支持"继续练习某一章节"功能

### 新系统特性
1. ✅ 支持**章节级别**进度（每个章节独立进度）
2. ✅ 使用 `current_question_number`（题号1,2,3...）
3. ✅ 记录用户、题库、章节、题号
4. ✅ 提供题库完成度统计和继续练习功能

---

## 📊 数据库变更

### 表结构变化

**表名**：`user_study_progress`

#### 新增字段
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `chapter_id` | INT NULL | 章节ID（NULL表示旧的题库级别记录） |
| `current_question_number` | INT NULL | 当前题号（从1开始，推荐使用） |

#### 索引变化
- ✅ 添加：`idx_chapter_id` - 章节索引
- ✅ 添加：`uk_user_bank_chapter` - 唯一约束（user_id, bank_id, chapter_id）
- ❌ 删除：`uk_user_bank` - 旧的唯一约束（仅题库级别）

#### 外键约束
- ✅ 添加：`fk_progress_chapter` - 章节外键约束

### 迁移脚本
```bash
# 执行迁移
npx ts-node -r tsconfig-paths/register scripts/migrate-progress-chapters.ts
```

---

## 🔗 新增API接口

### 1. 获取章节学习进度
```http
GET /api/user-progress/:bankId/chapters/:chapterId
```

**请求示例**：
```bash
GET /api/user-progress/15/chapters/1
Authorization: Bearer YOUR_TOKEN
```

**响应示例**：
```json
{
  "code": 200,
  "message": "获取章节学习进度成功",
  "data": {
    "id": 1,
    "user_id": 10,
    "bank_id": 15,
    "chapter_id": 1,
    "current_question_number": 5,
    "completed_count": 5,
    "total_questions": 50,
    "progress_percentage": 10,
    "chapter_name": "第01章-信息化发展",
    "bank_name": "系统架构师题库",
    "last_study_time": "2025-10-29 23:00:00"
  }
}
```

---

### 2. 保存章节学习进度
```http
POST /api/user-progress/:bankId/chapters/:chapterId
```

**请求体**：
```json
{
  "current_question_number": 5,
  "completed_count": 5,
  "total_questions": 50
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "保存章节学习进度成功",
  "data": {
    "id": 1,
    "user_id": 10,
    "bank_id": 15,
    "chapter_id": 1,
    "current_question_number": 5,
    "completed_count": 5,
    "total_questions": 50,
    "progress_percentage": 10
  }
}
```

---

### 3. 获取题库所有章节进度
```http
GET /api/user-progress/:bankId/chapters
```

**请求示例**：
```bash
GET /api/user-progress/15/chapters
Authorization: Bearer YOUR_TOKEN
```

**响应示例**：
```json
{
  "code": 200,
  "message": "获取题库章节进度成功",
  "data": [
    {
      "id": 1,
      "chapter_id": 1,
      "chapter_name": "第01章-信息化发展",
      "chapter_order": 1,
      "current_question_number": 5,
      "completed_count": 5,
      "total_questions": 50,
      "progress_percentage": 10,
      "last_study_time": "2025-10-29 23:00:00"
    },
    {
      "id": 2,
      "chapter_id": 2,
      "chapter_name": "第02章-信息技术发展",
      "chapter_order": 2,
      "current_question_number": 10,
      "completed_count": 10,
      "total_questions": 48,
      "progress_percentage": 21,
      "last_study_time": "2025-10-29 22:30:00"
    }
  ]
}
```

---

## 🔄 兼容性说明

### 旧接口仍然可用
```http
# 题库级别进度（兼容旧版本）
GET /api/user-progress/:bankId
POST /api/user-progress/:bankId
DELETE /api/user-progress/:bankId
```

### 数据兼容
- ✅ 旧记录保留（`chapter_id = NULL`）
- ✅ 新记录必须指定 `chapter_id`
- ✅ 推荐使用 `current_question_number`（题号）
- ⚠️ 保留 `current_question_index`（索引）用于向后兼容

---

## 💡 前端使用示例

### 场景1：答题页面（单题模式）

```javascript
// 1. 获取章节进度（判断是否需要继续练习）
const getChapterProgress = async (bankId, chapterId) => {
  const res = await fetch(`/api/user-progress/${bankId}/chapters/${chapterId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  if (data.data) {
    // 有进度，继续练习
    const { current_question_number, total_questions } = data.data;
    return current_question_number + 1; // 下一题
  } else {
    // 无进度，从第1题开始
    return 1;
  }
};

// 2. 加载题目
const loadQuestion = async (bankId, chapterId, questionNumber) => {
  const res = await fetch(
    `/api/question-banks/${bankId}/chapters/${chapterId}/questions?questionNumber=${questionNumber}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.data.question;
};

// 3. 保存进度（用户答完一题后）
const saveProgress = async (bankId, chapterId, currentNumber, completedCount, total) => {
  await fetch(`/api/user-progress/${bankId}/chapters/${chapterId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      current_question_number: currentNumber,
      completed_count: completedCount,
      total_questions: total
    })
  });
};

// 使用流程
const startPractice = async (bankId, chapterId) => {
  // 1. 获取应该从第几题开始
  const startNumber = await getChapterProgress(bankId, chapterId);
  
  // 2. 加载题目
  const question = await loadQuestion(bankId, chapterId, startNumber);
  
  // 3. 用户答题后保存进度
  await saveProgress(bankId, chapterId, startNumber, startNumber, 50);
};
```

---

### 场景2：题库首页（显示各章节完成度）

```javascript
const getBankProgress = async (bankId) => {
  const res = await fetch(`/api/user-progress/${bankId}/chapters`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.data;
};

// 渲染章节列表
const renderChapters = async (bankId) => {
  const progress = await getBankProgress(bankId);
  
  chapters.forEach(chapter => {
    const chapterProgress = progress.find(p => p.chapter_id === chapter.id);
    
    if (chapterProgress) {
      // 有进度，显示完成度和"继续练习"按钮
      console.log(`${chapter.name}: ${chapterProgress.progress_percentage}% 完成`);
      console.log(`继续从第 ${chapterProgress.current_question_number + 1} 题开始`);
    } else {
      // 无进度，显示"开始练习"按钮
      console.log(`${chapter.name}: 未开始`);
    }
  });
};
```

---

### 场景3：微信小程序示例

```javascript
// pages/practice/practice.js
Page({
  data: {
    bankId: 15,
    chapterId: 1,
    currentNumber: 1,
    question: null
  },
  
  async onLoad(options) {
    const { bankId, chapterId } = options;
    this.setData({ bankId, chapterId });
    
    // 获取进度
    const progress = await this.getProgress();
    const startNumber = progress ? progress.current_question_number + 1 : 1;
    
    // 加载题目
    await this.loadQuestion(startNumber);
  },
  
  async getProgress() {
    const res = await wx.request({
      url: `${API_BASE}/api/user-progress/${this.data.bankId}/chapters/${this.data.chapterId}`,
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` }
    });
    return res.data.data;
  },
  
  async loadQuestion(questionNumber) {
    const res = await wx.request({
      url: `${API_BASE}/api/question-banks/${this.data.bankId}/chapters/${this.data.chapterId}/questions`,
      data: { questionNumber },
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` }
    });
    
    const { question, total, hasNext } = res.data.data;
    this.setData({ 
      question, 
      currentNumber: questionNumber,
      total,
      hasNext 
    });
  },
  
  async nextQuestion() {
    // 保存当前进度
    await this.saveProgress();
    
    // 加载下一题
    await this.loadQuestion(this.data.currentNumber + 1);
  },
  
  async saveProgress() {
    await wx.request({
      url: `${API_BASE}/api/user-progress/${this.data.bankId}/chapters/${this.data.chapterId}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json'
      },
      data: {
        current_question_number: this.data.currentNumber,
        completed_count: this.data.currentNumber,
        total_questions: this.data.total
      }
    });
  }
});
```

---

## 📝 API参数对比

### 旧版本（题库级别）
```json
{
  "current_question_index": 4,  // 索引（0,1,2,3,4...）
  "completed_count": 5,
  "total_questions": 100
}
```

### 新版本（章节级别）
```json
{
  "chapter_id": 1,                    // 章节ID
  "current_question_number": 5,       // 题号（1,2,3,4,5...）
  "completed_count": 5,
  "total_questions": 50               // 该章节的总题数
}
```

---

## ⚠️ 注意事项

1. **唯一性约束**：同一用户在同一题库的同一章节只能有一条进度记录
2. **题号从1开始**：`current_question_number` 从1开始，与 `questionNumber` 参数保持一致
3. **向后兼容**：旧的题库级别接口仍可使用（`chapter_id = NULL`）
4. **删除行为**：删除章节会级联删除该章节的学习进度

---

## 🚀 迁移建议

### 对于新项目
直接使用新的章节级别API：
- `POST /api/user-progress/:bankId/chapters/:chapterId`
- `GET /api/user-progress/:bankId/chapters/:chapterId`

### 对于旧项目
可以继续使用旧API，或逐步迁移：
1. 继续使用 `POST /api/user-progress/:bankId`（题库级别）
2. 在新功能中使用章节级别API
3. 旧数据（`chapter_id = NULL`）不受影响

---

## ✅ 总结

| 特性 | 旧版本 | 新版本 |
|------|--------|--------|
| 进度粒度 | 题库级别 | 章节级别 ✅ |
| 题目定位 | 索引（0开始） | 题号（1开始） ✅ |
| 继续练习 | 不支持章节 | 支持章节 ✅ |
| 完成度统计 | 整体统计 | 分章节统计 ✅ |
| API兼容性 | - | 向后兼容 ✅ |

**升级完成！** 🎉
