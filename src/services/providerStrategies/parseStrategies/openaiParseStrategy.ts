import { BaseParseStrategy, ParseResult } from './baseParseStrategy';
import { FileContentResult } from '@/utils/fileContentReader';
import { logger } from '@/utils/logger';

export class OpenAIParseStrategy extends BaseParseStrategy {
  async parseFile(fileContentResult: FileContentResult, fileName: string, filePath: string): Promise<ParseResult> {
    try {
      const systemPrompt = await this.buildSystemPrompt();
      
      // 构建消息内容
      const userMessage = this.buildUserMessage(fileContentResult, fileName);
      
      // 准备请求数据记录
      const requestData = {
        fileContentType: fileContentResult.type,
        fileMimeType: fileContentResult.mimeType,
        fileName: fileName,
        provider: this.provider.name,
        model: this.modelName,
        endpoint: this.provider.endpoint,
        messageType: userMessage.content ? (Array.isArray(userMessage.content) ? 'multipart' : 'text') : 'unknown',
      };
      
      logger.info('OpenAI请求数据:', requestData);
      
      const response = await this.axiosInstance.post(
        `${this.provider.endpoint}`,
        {
          model: this.modelName,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            userMessage,
          ],
          temperature: 0.3, // 降低随机性，提高准确性
          response_format: { type: 'json_object' }, // 强制返回JSON
        },
        {
          headers: {
            'Authorization': `Bearer ${this.provider.api_key}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // 准备响应数据记录
      const responseData = {
        status: response.status,
        statusText: response.statusText,
        model: response.data.model,
        usage: response.data.usage,
        finishReason: response.data.choices?.[0]?.finish_reason,
        contentPreview: response.data.choices?.[0]?.message?.content?.substring(0, 500) || '',
      };
      
      logger.info('OpenAI响应数据:', responseData);

      const content = response.data.choices[0].message.content;
      const parsedData = JSON.parse(content);

      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('AI返回格式错误：缺少questions数组');
      }

      logger.info('OpenAI解析成功', {
        provider: this.provider.name,
        model: this.modelName,
        questionCount: parsedData.questions.length,
      });

      return {
        success: true,
        questions: parsedData.questions,
        totalQuestions: parsedData.questions.length,
        requestData,
        responseData,
      };
    } catch (error: any) {
      logger.error('OpenAI解析失败', {
        provider: this.provider.name,
        model: this.modelName,
        error: error.message,
        response: error.response?.data,
      });

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
        error: `OpenAI解析失败: ${error.response?.data?.error?.message || error.message}`,
        requestData: {
          fileContentType: fileContentResult.type,
          fileMimeType: fileContentResult.mimeType,
          fileName: fileName,
          provider: this.provider.name,
          model: this.modelName,
        },
        responseData: errorResponseData,
      };
    }
  }

  /**
   * 构建用户消息，支持文本和图片/PDF的base64格式
   */
  private buildUserMessage(fileContentResult: FileContentResult, fileName: string): any {
    if (fileContentResult.type === 'text') {
      // 文本内容
      return {
        role: 'user',
        content: this.buildUserPrompt(fileContentResult, fileName),
      };
    } else if (fileContentResult.type === 'base64') {
      // 图片或PDF的base64内容
      const content = fileContentResult.content as string;
      const mimeType = fileContentResult.mimeType || 'image/jpeg';
      
      return {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `请解析以下${mimeType.includes('pdf') ? 'PDF文档' : '图片'}中的题目内容，文件名：${fileName}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${content}`,
            },
          },
        ],
      };
    } else if (fileContentResult.type === 'base64_array') {
      // PDF转换的多张图片
      const contents = fileContentResult.content as string[];
      const mimeType = fileContentResult.mimeType || 'image/png';
      const imageContents = contents.map((base64, index) => ({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
        },
      }));
      
      return {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `请解析以下PDF文档中的题目内容，文件名：${fileName}，共${contents.length}页`,
          },
          ...imageContents,
        ],
      };
    }
    
    // 默认返回文本格式
    return {
      role: 'user',
      content: this.buildUserPrompt(fileContentResult, fileName),
    };
  }
}
