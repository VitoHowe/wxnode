import { BaseParseStrategy, ParseResult } from './baseParseStrategy';
import { FileContentResult } from '@/utils/fileContentReader';
import { logger } from '@/utils/logger';

export class GeminiParseStrategy extends BaseParseStrategy {
  async parseFile(fileContentResult: FileContentResult, fileName: string): Promise<ParseResult> {
    // 准备请求数据记录（截断base64以减少存储）
    const requestDataForLog = this.prepareRequestDataForLog(fileContentResult, fileName);
    
    try {
      const systemPrompt = await this.buildSystemPrompt();
      
      // 构建parts内容
      const parts = this.buildParts(fileContentResult, fileName, systemPrompt);
      
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
      
      const response = await this.axiosInstance.post(
        `${this.provider.endpoint}/v1beta/models/${this.modelName}:generateContent`,
        {
          contents: [
            {
              parts: parts,
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 1,
            topP: 1,
            maxOutputTokens: 8192,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.provider.api_key,
          },
        }
      );
      
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
      
      // 提取JSON部分（Gemini可能返回带markdown的内容）
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法从Gemini响应中提取JSON数据');
      }

      const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('AI返回格式错误：缺少questions数组');
      }

      logger.info('Gemini解析成功', {
        provider: this.provider.name,
        model: this.modelName,
        questionCount: parsedData.questions.length,
      });

      return {
        success: true,
        questions: parsedData.questions,
        totalQuestions: parsedData.questions.length,
        requestData: fullRequestData,
        responseData: responseDataForLog,
      };
    } catch (error: any) {
      logger.error('Gemini解析失败', {
        provider: this.provider.name,
        model: this.modelName,
        error: error.message,
        response: error.response?.data,
      });

      // 准备错误响应数据
      const errorResponseData = {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorData: error.response?.data,
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
   * 构建Gemini API的parts内容，支持文本和base64格式
   */
  private buildParts(fileContentResult: FileContentResult, fileName: string, systemPrompt: string): any[] {
    if (fileContentResult.type === 'text') {
      // 文本内容
      return [
        {
          text: `${systemPrompt}\n\n${this.buildUserPrompt(fileContentResult, fileName)}`,
        },
      ];
    } else if (fileContentResult.type === 'base64') {
      // 图片或PDF的base64内容
      const content = fileContentResult.content as string;
      const mimeType = fileContentResult.mimeType || 'image/jpeg';
      
      return [
        {
          text: `${systemPrompt}\n\n请解析以下${mimeType.includes('pdf') ? 'PDF文档' : '图片'}中的题目内容，文件名：${fileName}`,
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
          text: `${systemPrompt}\n\n请解析以下PDF文档中的题目内容，文件名：${fileName}，共${contents.length}页`,
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
        text: `${systemPrompt}\n\n${this.buildUserPrompt(fileContentResult, fileName)}`,
      },
    ];
  }
}
