# Gemini Balance - API 快速参考

## 🚀 快速开始

**Base URL**: `http://your-domain:8000`

**认证方式**:
- OpenAI 兼容 API: `Authorization: Bearer sk-your-token`
- Gemini 原生 API: `?key=sk-your-token`

---

## 📋 API 端点总览

### 对话 API

| 端点 | 方法 | 说明 | 文档 |
|------|------|------|------|
| `/v1/chat/completions` | POST | OpenAI 兼容对话 | [详情](#openai-对话) |
| `/v1beta/models/{model}:generateContent` | POST | Gemini 原生对话 | [详情](#gemini-对话) |
| `/v1beta/models/{model}:streamGenerateContent` | POST | Gemini 流式对话 | [详情](#gemini-流式对话) |

### 文件 API

| 端点 | 方法 | 说明 | 文档 |
|------|------|------|------|
| `/upload/v1beta/files` | POST | 初始化文件上传 | [详情](#文件上传) |
| `<upload_url>` | POST | 上传文件内容 | [详情](#文件上传) |
| `/v1beta/files` | GET | 列出文件 | [详情](#列出文件) |
| `/v1beta/files/{file_id}` | GET | 获取文件信息 | [详情](#获取文件) |
| `/v1beta/files/{file_id}` | DELETE | 删除文件 | [详情](#删除文件) |

### 其他 API

| 端点 | 方法 | 说明 | 文档 |
|------|------|------|------|
| `/v1/models` | GET | 获取模型列表 | [详情](#模型列表) |
| `/v1/embeddings` | POST | 文本嵌入 | [详情](#文本嵌入) |
| `/v1/images/generations` | POST | 图片生成 | [详情](#图片生成) |
| `/v1/audio/speech` | POST | 语音合成 | [详情](#语音合成) |

---

## 🔥 常用示例

### OpenAI 对话

```javascript
fetch('http://localhost:8000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-476939672',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gemini-2.0-flash-exp',
    messages: [{ role: 'user', content: '你好' }]
  })
})
```

### Gemini 对话

```javascript
fetch('http://localhost:8000/v1beta/models/gemini-2.0-flash-exp:generateContent?key=sk-476939672', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      role: 'user',
      parts: [{ text: '你好' }]
    }]
  })
})
```

### 文件上传

```javascript
// 步骤 1: 初始化
const initRes = await fetch('http://localhost:8000/upload/v1beta/files', {
  method: 'POST',
  // headers: {
  //   'X-Goog-Upload-Protocol': 'resumable',
  //   'X-Goog-Upload-Command': 'start',
  //   'X-Goog-Upload-Header-Content-Length': file.size.toString(),
  //   'X-Goog-Upload-Header-Content-Type': file.type,
  //   'Content-Type': 'application/json'
  // },
  body: JSON.stringify({ file: { displayName: file.name } })
});

const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');

// 步骤 2: 上传
await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    'X-Goog-Upload-Command': 'upload, finalize',
    'X-Goog-Upload-Offset': '0',
    // 'Content-Length': file.size.toString()
  },
  body: file
});
```

### 使用文件对话

```javascript
fetch('http://localhost:8000/v1beta/models/gemini-2.0-flash-exp:generateContent?key=sk-476939672', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        {
          fileData: {
            mimeType: 'image/jpeg',
            fileUri: 'https://generativelanguage.googleapis.com/v1beta/files/abc123'
          }
        },
        { text: '请描述这张图片' }
      ]
    }]
  })
})
```

---

## 📖 详细说明

### OpenAI 对话

**完整参数**:

```json
{
  "model": "gemini-2.0-flash-exp",
  "messages": [
    { "role": "system", "content": "你是一个助手" },
    { "role": "user", "content": "你好" }
  ],
  "temperature": 0.7,
  "top_p": 0.95,
  "max_tokens": 2000,
  "stream": false,
  "functions": [],
  "function_call": "auto"
}
```

**响应**:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "你好！我是..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### Gemini 对话

**完整参数**:

```json
{
  "contents": [{
    "role": "user",
    "parts": [{ "text": "你好" }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 2000
  },
  "systemInstruction": {
    "role": "system",
    "parts": [{ "text": "你是一个助手" }]
  }
}
```

**响应**:

```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "你好！我是..." }],
      "role": "model"
    },
    "finishReason": "STOP"
  }],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 20,
    "totalTokenCount": 30
  }
}
```

### Gemini 流式对话

**请求**:

```javascript
const response = await fetch(
  'http://localhost:8000/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=sk-476939672',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: '写一首诗' }] }]
    })
  }
);

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // 处理 SSE 数据
}
```

### 文件上传

**步骤 1: 初始化**

```
POST /upload/v1beta/files?key=sk-xxx

Headers:
  X-Goog-Upload-Protocol: resumable
  X-Goog-Upload-Command: start
  X-Goog-Upload-Header-Content-Length: <文件大小>
  X-Goog-Upload-Header-Content-Type: <MIME类型>
  Content-Type: application/json

Body:
  {"file": {"displayName": "文件名"}}

Response Headers:
  X-Goog-Upload-URL: <上传URL>
```

**步骤 2: 上传内容**

```
POST <上传URL>

Headers:
  X-Goog-Upload-Command: upload, finalize
  X-Goog-Upload-Offset: 0
  Content-Length: <文件大小>

Body:
  <文件二进制数据>

Response:
  {"file": {"uri": "https://...", "name": "files/abc123", ...}}
```

### 列出文件

```
GET /v1beta/files?key=sk-xxx&pageSize=10&pageToken=xxx

Response:
{
  "files": [
    {
      "name": "files/abc123",
      "uri": "https://...",
      "mimeType": "image/jpeg",
      "sizeBytes": "524288",
      "state": "ACTIVE"
    }
  ],
  "nextPageToken": "xxx"
}
```

### 获取文件

```
GET /v1beta/files/{file_id}

Response:
{
  "name": "files/abc123",
  "uri": "https://...",
  "mimeType": "image/jpeg",
  "sizeBytes": "524288",
  "state": "ACTIVE",
  "createTime": "2025-10-19T00:00:00Z",
  "expirationTime": "2025-10-21T00:00:00Z"
}
```

### 删除文件

```
DELETE /v1beta/files/{file_id}

Response:
{
  "success": true,
  "message": "File deleted successfully"
}
```

### 模型列表

```
GET /v1/models
Authorization: Bearer sk-xxx

Response:
{
  "object": "list",
  "data": [
    {
      "id": "gemini-2.0-flash-exp",
      "object": "model",
      "owned_by": "google"
    }
  ]
}
```

### 文本嵌入

```
POST /v1/embeddings
Authorization: Bearer sk-xxx

Body:
{
  "model": "text-embedding-004",
  "input": "这是一段文本"
}

Response:
{
  "data": [{
    "embedding": [0.0023, -0.0042, ...],
    "index": 0
  }],
  "usage": {
    "prompt_tokens": 5,
    "total_tokens": 5
  }
}
```

### 图片生成

```
POST /v1/images/generations
Authorization: Bearer sk-xxx

Body:
{
  "prompt": "一只可爱的猫咪",
  "n": 1,
  "size": "1024x1024"
}

Response:
{
  "data": [{
    "url": "https://example.com/image.jpg"
  }]
}
```

### 语音合成

```
POST /v1/audio/speech
Authorization: Bearer sk-xxx

Body:
{
  "model": "tts-1",
  "input": "你好，这是测试",
  "voice": "alloy",
  "speed": 1.0
}

Response:
  <audio/wav binary data>
```

---

## 🔧 工具函数

### 通用请求函数

```javascript
async function apiRequest(endpoint, options = {}) {
  const baseUrl = 'http://localhost:8000';
  const apiKey = 'sk-476939672';
  
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    ...defaultOptions
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Request failed');
  }
  
  return response.json();
}

// 使用
const result = await apiRequest('/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'gemini-2.0-flash-exp',
    messages: [{ role: 'user', content: '你好' }]
  })
});
```

### 文件上传函数

```javascript
async function uploadFile(file, apiKey, baseUrl = 'http://localhost:8000') {
  // 步骤 1: 初始化
  const initRes = await fetch(`${baseUrl}/upload/v1beta/files`, {
    method: 'POST',
    // headers: {
    //   'X-Goog-Upload-Protocol': 'resumable',
    //   'X-Goog-Upload-Command': 'start',
    //   'X-Goog-Upload-Header-Content-Length': file.size.toString(),
    //   'X-Goog-Upload-Header-Content-Type': file.type,
    //   'Content-Type': 'application/json'
    // },
    body: JSON.stringify({ file: { displayName: file.name } })
  });

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');

  // 步骤 2: 上传
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      // 'Content-Length': file.size.toString()
    },
    body: file
  });

  const result = await uploadRes.json();
  return result.file;
}

// 使用
const fileInfo = await uploadFile(file);
console.log(fileInfo.uri);
```

### 流式响应处理

```javascript
async function* streamChat(messages, apiKey, baseUrl = 'http://localhost:8000') {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemini-2.0-flash-exp',
      messages: messages,
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        const json = JSON.parse(data);
        const content = json.choices[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}

// 使用
for await (const chunk of streamChat([{ role: 'user', content: '你好' }], 'sk-476939672')) {
  console.log(chunk);
}
```

---

## 📚 相关文档

- **[OPENAI_COMPATIBLE_API.md](./OPENAI_COMPATIBLE_API.md)** - OpenAI 兼容 API 完整文档
- **[CHAT_API_REFERENCE.md](./CHAT_API_REFERENCE.md)** - Gemini 对话 API 详细说明
- **[FILES_API_REFERENCE.md](./FILES_API_REFERENCE.md)** - 文件 API 完整规范
- **[FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)** - 前端集成指南

---

**最后更新**: 2025-10-19
