import { BaseParseStrategy, ParseResult } from './baseParseStrategy';
import { logger } from '@/utils/logger';

export class GeminiParseStrategy extends BaseParseStrategy {
  async parseFile(fileContent: string, fileName: string): Promise<ParseResult> {
    try {
      const systemPrompt = await this.buildSystemPrompt();
      
      const response = await this.axiosInstance.post(
        `${this.provider.endpoint}:generateContent?key=${this.provider.api_key}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${this.buildUserPrompt(fileContent, fileName)}`,
                },
              ],
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
          },
        }
      );

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
      };
    } catch (error: any) {
      logger.error('Gemini解析失败', {
        provider: this.provider.name,
        model: this.modelName,
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        questions: [],
        totalQuestions: 0,
        error: `Gemini解析失败: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  }
}
