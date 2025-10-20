import { BaseParseStrategy, ParseResult } from './baseParseStrategy';
import { FileContentResult } from '@/utils/fileContentReader';
import { logger } from '@/utils/logger';
import fs from 'fs';
import path from 'path';

// 文件大小阈值：5MB，超过此大小的文件将上传到Gemini而非使用base64
const FILE_SIZE_THRESHOLD = 5 * 1024 * 1024;

export class GeminiParseStrategy extends BaseParseStrategy {
  async parseFile(fileContentResult: FileContentResult, fileName: string, filePath: string): Promise<ParseResult> {
    // 准备请求数据记录（截断base64以减少存储）
    const requestDataForLog = this.prepareRequestDataForLog(fileContentResult, fileName);
    
    // 记录上传的文件ID，用于后续删除
    let uploadedFileId: string | undefined;
    
    // 保存完整的响应数据，用于错误时记录
    let fullResponseData: any = null;
    let responseText: string | null = null;
    
    try {
      const systemPrompt = await this.buildSystemPrompt();
      
      // 检查是否需要上传文件（仅处理非文本文件且超过阈值的情况）
      let fileUri: string | undefined;
      if (fileContentResult.type !== 'text' && filePath && fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        
        if (fileSize >= FILE_SIZE_THRESHOLD) {
          logger.info('文件大小超过阈值，将上传到Gemini', {
            filePath,
            fileSize,
            threshold: FILE_SIZE_THRESHOLD,
          });
          
          try {
            // 生成唯一标识：fileName_fileSize
            const displayName = `${fileName}`;
            
            // 先查询文件是否已存在
            const existingFile = await this.queryExistingFile(displayName);
            
            if (existingFile) {
              // 文件已存在，直接使用
              fileUri = existingFile.uri;
              uploadedFileId = existingFile.fileId;
              logger.info('使用已存在的文件', { fileUri, fileId: uploadedFileId });
            } else {
              // 文件不存在，执行上传
              const uploadResult = await this.uploadFileToGemini(
                filePath,
                fileContentResult.mimeType || 'application/octet-stream',
                displayName
              );
              
              fileUri = uploadResult.uri;
              uploadedFileId = uploadResult.fileId;
              
              logger.info('文件上传成功', { fileUri, fileId: uploadedFileId });
            }
          } catch (uploadError: any) {
            logger.error('文件上传失败，降级使用base64方式', {
              error: uploadError.message,
              filePath,
            });
            // 上传失败，fileUri保持undefined，将使用base64方式
          }
        }
      }
      
      // 构建parts内容
      const parts = this.buildParts(fileContentResult, fileName, systemPrompt, fileUri);
      
      // 准备完整的请求数据
      const fullRequestData = {
        fileContentType: fileContentResult.type,
        fileMimeType: fileContentResult.mimeType,
        fileName: fileName,
        provider: this.provider.name,
        model: this.modelName,
        endpoint: `${this.provider.endpoint}/v1beta/models/${this.modelName}:generateContent`,
        partsCount: parts.length,
        parts: this.sanitizePartsForLog(parts),
      };
      
      logger.info('Gemini请求数据:', fullRequestData);
      
      const apiUrl = `${this.provider.endpoint}/v1beta/models/${this.modelName}:generateContent`;
      logger.info('🚀 开始调用Gemini API', {
        url: apiUrl,
        model: this.modelName,
        partsCount: parts.length,
        hasFileUri: parts.some((p: any) => p.file_data),
      });
      
      const response = await this.axiosInstance.post(
        apiUrl,
        {
          contents: [
            {
              parts: parts,
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topP: 1,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.provider.api_key,
          },
          timeout: 300000, // 5分钟超时
        }
      );
      
      logger.info('✅ Gemini API响应成功', {
        status: response.status,
        statusText: response.statusText,
      });
      
      // 保存完整响应
      fullResponseData = response.data;
      
      // 准备响应数据记录
      const responseDataForLog = {
        status: response.status,
        statusText: response.statusText,
        candidatesCount: response.data.candidates?.length || 0,
        responseText: response.data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 1000) || '', // 截取前1000字符
        fullResponse: response.data,
      };
      
      logger.info('Gemini响应数据:', responseDataForLog);
      
      const text = response.data.candidates[0].content.parts[0].text;
      responseText = text;
      
      logger.info('📝 完整响应文本', {
        textLength: text.length,
        textPreview: text.substring(0, 500),
        fullText: text, // 记录完整文本
      });
      
      // 提取JSON部分（Gemini可能返回带markdown的内容）
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('❌ 无法提取JSON数据', {
          responseText: text,
          textLength: text.length,
          hasJsonCodeBlock: text.includes('```json'),
          hasJsonObject: text.includes('{'),
          fullResponse: response.data,
        });
        throw new Error('无法从Gemini响应中提取JSON数据');
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      logger.info('🔍 提取到的JSON字符串', {
        jsonLength: jsonString.length,
        jsonPreview: jsonString.substring(0, 500),
      });
      
      let parsedData;
      try {
        parsedData = JSON.parse(jsonString);
      } catch (parseError: any) {
        logger.error('❌ JSON解析失败', {
          error: parseError.message,
          jsonString: jsonString,
        });
        throw new Error(`JSON解析失败: ${parseError.message}`);
      }

      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        logger.error('❌ 格式错误：缺少questions数组', {
          parsedData,
          hasQuestions: !!parsedData.questions,
          questionsType: typeof parsedData.questions,
          dataKeys: Object.keys(parsedData),
        });
        throw new Error('AI返回格式错误：缺少questions数组');
      }

      logger.info('Gemini解析成功', {
        provider: this.provider.name,
        model: this.modelName,
        questionCount: parsedData.questions.length,
      });

      // 如果使用了文件上传，解析成功后删除临时文件
      if (uploadedFileId) {
        await this.deleteUploadedFile(uploadedFileId);
      }

      return {
        success: true,
        questions: parsedData.questions,
        totalQuestions: parsedData.questions.length,
        requestData: fullRequestData,
        responseData: responseDataForLog,
      };
    } catch (error: any) {
      // 解析失败时保留文件，便于用户重试
      if (uploadedFileId) {
        logger.info('解析失败，保留上传文件以便重试', { fileId: uploadedFileId });
      }

      logger.error('❌ Gemini解析失败', {
        provider: this.provider.name,
        model: this.modelName,
        errorMessage: error.message,
        errorStack: error.stack,
        // API错误响应
        apiResponseStatus: error.response?.status,
        apiResponseData: error.response?.data,
        // 捕获的完整响应
        fullResponseData: fullResponseData,
        responseText: responseText,
        responseTextLength: responseText?.length || 0,
      });

      // 准备完整的错误响应数据
      const errorResponseData = {
        error: error.message,
        errorStack: error.stack,
        // API错误响应（网络错误、超时等）
        apiStatus: error.response?.status,
        apiStatusText: error.response?.statusText,
        apiErrorData: error.response?.data,
        // 成功响应但解析失败的情况
        fullResponse: fullResponseData,
        fullResponseText: responseText,
        responseTextLength: responseText?.length || 0,
        hasCandidates: fullResponseData?.candidates?.length > 0,
        candidatesCount: fullResponseData?.candidates?.length || 0,
      };

      return {
        success: false,
        questions: [],
        totalQuestions: 0,
        error: `Gemini解析失败: ${error.response?.data?.error?.message || error.message}`,
        requestData: requestDataForLog,
        responseData: errorResponseData,
      };
    }
  }

  /**
   * 准备请求数据用于日志记录（基础版本）
   */
  private prepareRequestDataForLog(fileContentResult: FileContentResult, fileName: string): any {
    return {
      fileContentType: fileContentResult.type,
      fileMimeType: fileContentResult.mimeType,
      fileName: fileName,
      provider: this.provider.name,
      model: this.modelName,
      contentSize: typeof fileContentResult.content === 'string' 
        ? fileContentResult.content.length 
        : (fileContentResult.content as string[]).length,
    };
  }

  /**
   * 清理parts数据用于日志（截断base64）
   */
  private sanitizePartsForLog(parts: any[]): any[] {
    return parts.map(part => {
      if (part.inline_data?.data) {
        return {
          ...part,
          inline_data: {
            ...part.inline_data,
            data: `[BASE64_DATA_LENGTH: ${part.inline_data.data.length}]`, // 只记录长度
          },
        };
      }
      if (part.text && part.text.length > 500) {
        return {
          text: part.text.substring(0, 500) + '... [TRUNCATED]',
        };
      }
      return part;
    });
  }

  /**
   * 查询已上传到Gemini的文件
   * @param displayName 文件显示名称（格式：fileName_fileSize）
   * @returns 文件信息或null
   */
  private async queryExistingFile(
    displayName: string
  ): Promise<{ uri: string; fileId: string } | null> {
    try {
      logger.info('查询已上传的文件', { displayName });
      
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
          logger.info('发现已上传的文件，直接使用', {
            displayName,
            uri: file.uri,
            fileId: file.name,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          });
          
          return {
            uri: file.uri,
            fileId: file.name,
          };
        }
      }
      
      logger.info('未找到已上传的文件', { displayName });
      return null;
    } catch (error: any) {
      // 查询失败不影响主流程，返回null继续上传
      logger.warn('查询已上传文件失败，将继续执行上传', {
        displayName,
        error: error.message,
        response: error.response?.data,
      });
      return null;
    }
  }

  /**
   * 上传文件到Gemini
   * @param filePath 文件路径
   * @param mimeType MIME类型
   * @param fileName 文件名
   * @returns 文件URI和FileID
   */
  private async uploadFileToGemini(
    filePath: string,
    mimeType: string,
    displayName: string
  ): Promise<{ uri: string; fileId: string }> {
    try {
      // 步骤 1: 初始化上传
      logger.info('初始化Gemini文件上传', { filePath, mimeType, displayName });
      
      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      
      const initResponse = await this.axiosInstance.post(
        `${this.provider.endpoint}/upload/v1beta/files`,
        {
          file: { displayName }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.provider.api_key,
          }
        }
      );
      
      const uploadUrl = initResponse.headers['x-goog-upload-url'];
      if (!uploadUrl) {
        throw new Error('未获取到上传URL');
      }
      
      logger.info('获取到上传URL', { uploadUrl });
      
      // 步骤 2: 上传文件内容
      const fileBuffer = fs.readFileSync(filePath);
      
      const uploadResponse = await this.axiosInstance.post(
        uploadUrl,
        fileBuffer,
        {
          headers: {
            'Content-Type': mimeType,
            'X-Goog-Upload-Command': 'upload, finalize',
            'X-Goog-Upload-Offset': '0',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 300000, // 5分钟超时，适合大文件上传
        }
      );
      
      const fileInfo = uploadResponse.data.file;
      if (!fileInfo || !fileInfo.uri) {
        throw new Error('上传响应中未包含文件URI');
      }
      
      logger.info('文件上传完成', { 
        uri: fileInfo.uri,
        name: fileInfo.name,
        mimeType: fileInfo.mimeType,
        sizeBytes: fileInfo.sizeBytes,
      });
      
      // 返回uri和fileId（fileId从响应的name字段获取）
      return {
        uri: fileInfo.uri,
        fileId: fileInfo.name, // 例如: "files/qtgw91pi8dg0"
      };
    } catch (error: any) {
      logger.error('Gemini文件上传失败', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(`文件上传失败: ${error.message}`);
    }
  }

  /**
   * 删除已上传到Gemini的文件
   * @param fileId 文件ID（例如："files/qtgw91pi8dg0"）
   */
  private async deleteUploadedFile(fileId: string): Promise<void> {
    try {
      logger.info('开始删除Gemini上传文件', { fileId });
      
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
      logger.warn('Gemini上传文件删除失败', {
        fileId,
        error: error.message,
        response: error.response?.data,
      });
    }
  }

  /**
   * 构建Gemini API的parts内容，支持文本、base64格式和文件URI
   * @param fileUri 可选的文件URI，如果提供则使用file_data方式
   */
  private buildParts(
    fileContentResult: FileContentResult, 
    fileName: string, 
    systemPrompt: string,
    fileUri?: string
  ): any[] {
    if (fileContentResult.type === 'text') {
      // 文本内容
      return [
        {
          text: `${systemPrompt}`,
        },
      ];
    } else if (fileContentResult.type === 'base64') {
      // 图片或PDF内容
      const mimeType = fileContentResult.mimeType || 'image/jpeg';
      const promptText = `${systemPrompt}\n\n请解析以下${mimeType.includes('pdf') ? 'PDF文档' : '图片'}中的题目内容，文件名：${fileName}`;
      
      // 如果有fileUri，使用file_data方式
      if (fileUri) {
        return [
          {
            text: promptText,
          },
          {
            file_data: {
              mime_type: mimeType,
              file_uri: fileUri,
            },
          },
        ];
      }
      
      // 否则使用inline_data方式（base64）
      const content = fileContentResult.content as string;
      return [
        {
          text: promptText,
        },
        {
          inline_data: {
            mime_type: mimeType,
            data: content,
          },
        },
      ];
    } else if (fileContentResult.type === 'base64_array') {
      // PDF转换的多张图片（Gemini不应该走到这里，因为它直接处理PDF）
      const contents = fileContentResult.content as string[];
      const mimeType = fileContentResult.mimeType || 'image/png';
      const parts: any[] = [
        {
          text: `${systemPrompt}`,
        },
      ];
      
      contents.forEach((base64) => {
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64,
          },
        });
      });
      
      return parts;
    }
    
    // 默认返回文本格式
    return [
      {
        text: `${systemPrompt}`,
      },
    ];
  }
}
