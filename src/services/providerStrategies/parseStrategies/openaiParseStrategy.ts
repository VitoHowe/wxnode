import { BaseParseStrategy, ParseResult } from './baseParseStrategy';
import { logger } from '@/utils/logger';

export class OpenAIParseStrategy extends BaseParseStrategy {
  async parseFile(fileContent: string, fileName: string): Promise<ParseResult> {
    try {
      const systemPrompt = await this.buildSystemPrompt();
      
      const response = await this.axiosInstance.post(
        `${this.provider.endpoint}`,
        {
          model: this.modelName,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: this.buildUserPrompt(fileContent, fileName),
            },
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
      };
    } catch (error: any) {
      logger.error('OpenAI解析失败', {
        provider: this.provider.name,
        model: this.modelName,
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        questions: [],
        totalQuestions: 0,
        error: `OpenAI解析失败: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  }
}
