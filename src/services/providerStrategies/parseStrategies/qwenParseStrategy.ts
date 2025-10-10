import { BaseParseStrategy, ParseResult } from './baseParseStrategy';
import { logger } from '@/utils/logger';

export class QwenParseStrategy extends BaseParseStrategy {
  async parseFile(fileContent: string, fileName: string): Promise<ParseResult> {
    try {
      const systemPrompt = await this.buildSystemPrompt();
      
      const response = await this.axiosInstance.post(
        this.provider.endpoint,
        {
          model: this.modelName,
          input: {
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
          },
          parameters: {
            temperature: 0.3,
            result_format: 'message',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.provider.api_key}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.output.choices[0].message.content;
      
      // 提取JSON部分
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法从Qwen响应中提取JSON数据');
      }

      const parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('AI返回格式错误：缺少questions数组');
      }

      logger.info('Qwen解析成功', {
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
      logger.error('Qwen解析失败', {
        provider: this.provider.name,
        model: this.modelName,
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        questions: [],
        totalQuestions: 0,
        error: `Qwen解析失败: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  }
}
