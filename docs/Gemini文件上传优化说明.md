# Gemini 文件上传优化说明

## 修改概述

针对Gemini模型处理大文件时的优化，解决base64编码导致请求体过大的问题。

## 核心改进

### 1. 混合处理策略
- **小文件（<5MB）**：继续使用 `inline_data + base64` 方式
- **大文件（≥5MB）**：采用两步上传 + `file_data + file_uri` 方式

### 2. 智能文件管理
- **上传前查询**：先检查文件是否已存在，避免重复上传
- **文件标识**：使用 `{fileName}_{fileSize}` 作为唯一标识
- **智能重用**：找到已存在的ACTIVE状态文件直接使用
- **失败保留**：解析失败时保留文件，便于用户重试
- **成功清理**：仅在解析成功后删除临时文件

### 3. 超时时间优化
- 基类默认超时：120秒 → **300秒（5分钟）**
- 文件上传超时：**300秒（5分钟）**
- 适应大文件处理需求

## 修改文件清单

### 1. `baseParseStrategy.ts`
```typescript
// 调整默认超时时间
this.axiosInstance = axios.create({
  timeout: 300000, // 5分钟超时，适合大文件解析
});

// 添加filePath参数到parseFile接口
abstract parseFile(
  fileContentResult: FileContentResult, 
  fileName: string, 
  filePath: string
): Promise<ParseResult>;
```

### 2. `geminiParseStrategy.ts` ⭐ 核心修改

#### 新增常量
```typescript
const FILE_SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB阈值
```

#### 新增智能文件管理
```typescript
async parseFile(...) {
  let uploadedFileId: string | undefined; // 追踪上传的文件ID
  
  try {
    if (fileSize >= FILE_SIZE_THRESHOLD) {
      // 生成唯一标识
      const displayName = `${fileName}_${fileSize}`;
      
      // 先查询文件是否已存在
      const existingFile = await this.queryExistingFile(displayName);
      
      if (existingFile) {
        // 文件已存在，直接使用
        fileUri = existingFile.uri;
        uploadedFileId = existingFile.fileId;
        logger.info('发现已上传的文件，直接使用');
      } else {
        // 文件不存在，执行上传
        const uploadResult = await this.uploadFileToGemini(...);
        fileUri = uploadResult.uri;
        uploadedFileId = uploadResult.fileId;
      }
    }
    
    // ... 解析逻辑
    
    // 解析成功后删除临时文件
    if (uploadedFileId) {
      await this.deleteUploadedFile(uploadedFileId);
    }
    
    return result;
  } catch (error) {
    // 解析失败时保留文件，便于用户重试
    if (uploadedFileId) {
      logger.info('解析失败，保留上传文件以便重试');
    }
    throw error;
  }
}
```

#### 修改上传方法返回类型
```typescript
private async uploadFileToGemini(
  filePath: string,
  mimeType: string,
  fileName: string
): Promise<{ uri: string; fileId: string }> {
  // ... 上传逻辑
  
  return {
    uri: fileInfo.uri,           // 用于API调用
    fileId: fileInfo.name,       // 用于后续删除，例如："files/qtgw91pi8dg0"
  };
}
```

#### 新增查询文件方法
```typescript
private async queryExistingFile(
  displayName: string
): Promise<{ uri: string; fileId: string } | null> {
  try {
    // 获取文件列表
    const response = await this.axiosInstance.get(
      `${this.provider.endpoint}/v1beta/files`,
      {
        params: { pageSize: 100 },
        headers: { 'x-goog-api-key': this.provider.api_key },
      }
    );
    
    const files = response.data.files || [];
    
    // 查找匹配的文件（displayName相同且状态为ACTIVE）
    for (const file of files) {
      if (file.displayName === displayName && file.state === 'ACTIVE') {
        return {
          uri: file.uri,
          fileId: file.name,
        };
      }
    }
    
    return null;
  } catch (error: any) {
    // 查询失败不影响主流程，返回null继续上传
    logger.warn('查询已上传文件失败，将继续执行上传', { error });
    return null;
  }
}
```

#### 新增删除方法
```typescript
private async deleteUploadedFile(fileId: string): Promise<void> {
  try {
    await this.axiosInstance.delete(
      `${this.provider.endpoint}/v1beta/${fileId}`,
      {
        headers: {
          'x-goog-api-key': this.provider.api_key,
        },
      }
    );
    logger.info('Gemini上传文件删除成功', { fileId });
  } catch (error: any) {
    // 删除失败不影响主流程，只记录警告
    logger.warn('Gemini上传文件删除失败', { fileId, error });
  }
}
```

### 3. `openaiParseStrategy.ts` & `qwenParseStrategy.ts`
```typescript
// 更新方法签名以匹配基类
async parseFile(
  fileContentResult: FileContentResult, 
  fileName: string, 
  filePath: string  // 新增参数
): Promise<ParseResult>
```

### 4. `fileService.ts`
```typescript
// 调用时传递filePath参数
const result = await strategy.parseFile(
  fileContentResult, 
  path.basename(filePath), 
  filePath  // 新增参数
);
```

## 工作流程

```
接收文件
    ↓
检查文件大小
    ↓
    ├─ <5MB ────→ 使用inline_data + base64
    │                    ↓
    └─ ≥5MB ────→ 生成displayName (fileName_fileSize)
                         ↓
                  查询文件是否已存在
                         ↓
                  ┌──────┴──────┐
                  ↓             ↓
              已存在        不存在
                  ↓             ↓
           直接使用URI     上传到Gemini
                  ↓             ↓
                  └──────┬──────┘
                         ↓
                  使用file_data + fileUri
                         ↓
                  调用generateContent API
                         ↓
                  ┌──────┴──────┐
                  ↓             ↓
              解析成功      解析失败
                  ↓             ↓
          删除临时文件    保留文件(便于重试)
                  ↓             ↓
              返回结果      返回错误
```

## API 调用示例

### 文件上传响应
```json
{
  "file": {
    "name": "files/qtgw91pi8dg0",
    "displayName": "test-1234",
    "mimeType": "application/pdf",
    "sizeBytes": "999843",
    "uri": "https://generativelanguage.googleapis.com/v1beta/files/qtgw91pi8dg0",
    "state": "ACTIVE"
  }
}
```

### 使用file_data方式的parts
```typescript
{
  contents: [
    {
      parts: [
        { text: "系统提示词..." },
        {
          file_data: {
            mime_type: "application/pdf",
            file_uri: "https://generativelanguage.googleapis.com/v1beta/files/qtgw91pi8dg0"
          }
        }
      ]
    }
  ]
}
```

### 删除文件
```http
DELETE /v1beta/files/qtgw91pi8dg0
x-goog-api-key: YOUR_API_KEY
```

## 优势总结

✅ **解决大文件问题**：避免base64导致的请求体过大  
✅ **避免重复上传**：上传前先查询，已存在文件直接使用  
✅ **失败友好重试**：解析失败保留文件，重试时无需重新上传  
✅ **自动资源清理**：解析成功后自动删除临时文件  
✅ **智能降级**：上传失败自动回退到base64方式  
✅ **向后兼容**：小文件仍使用原有高效方式  
✅ **完善日志**：详细记录查询、上传、删除各环节  
✅ **容错设计**：查询和删除失败不影响主流程  

## 注意事项

⚠️ **API权限**：确保Gemini API Key具有文件上传和删除权限  
⚠️ **文件有效期**：Gemini上传的文件默认48小时后过期  
⚠️ **并发处理**：多文件并发上传时注意速率限制  
⚠️ **错误处理**：建议监控文件删除失败的日志，定期清理

## 测试建议

1. **小文件测试**：1-2MB的PDF，验证使用base64方式
2. **大文件测试**：10-20MB的PDF，验证上传+file_uri方式
3. **边界测试**：刚好5MB的文件，验证阈值逻辑
4. **重复上传测试**：同一文件多次解析，验证第二次直接使用已上传的文件
5. **失败重试测试**：第一次解析失败，验证文件保留且第二次解析直接使用
6. **上传失败测试**：模拟上传失败，验证降级到base64逻辑
7. **查询失败测试**：模拟查询接口失败，验证继续执行上传
8. **清理测试**：验证解析成功后正确删除文件，失败后保留文件

## 版本信息

- 修改日期：2025-10-19
- 修改人：Cascade AI
- 版本：v2.0
