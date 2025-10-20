import axios, { AxiosInstance } from 'axios';
import { ProviderConfig, systemService } from '@/services/systemService';
import { logger } from '@/utils/logger';
import { FileContentResult } from '@/utils/fileContentReader';

// 文件类型
type FileType = 'question_bank' | 'knowledge_base';

export interface ParsedQuestion {
  type: 'single' | 'multiple' | 'judge' | 'fill' | 'essay';
  content: string;
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty?: number;
  tags?: string[];
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  error?: string;
  totalQuestions: number;
  requestData?: any; // 请求数据（fileContentResult、parts等）
  responseData?: any; // API响应数据
}

export abstract class BaseParseStrategy {
  protected axiosInstance: AxiosInstance;
  protected provider: ProviderConfig;
  protected modelName: string;
  protected fileType: FileType;

  constructor(provider: ProviderConfig, modelName: string, fileType: FileType = 'question_bank') {
    this.provider = provider;
    this.modelName = modelName;
    this.fileType = fileType;
    this.axiosInstance = axios.create({
      timeout: 300000, // 5分钟超时，适合大文件解析
    });
  }

  /**
   * 解析文件内容
   * @param fileContentResult 文件内容结果（可能是文本或base64）
   * @param fileName 文件名
   * @param filePath 文件路径（用于大文件上传）
   */
  abstract parseFile(fileContentResult: FileContentResult, fileName: string, filePath: string): Promise<ParseResult>;

  /**
   * 构建系统提示词
   */
  protected async buildSystemPrompt(): Promise<string> {
    try {
      // 根据文件类型获取对应的提示词配置
      const settingType = this.fileType === 'knowledge_base' ? 'knowledge_format' : 'question_parse_format';
      const setting = await systemService.getSetting<{ prompt?: string }>(settingType);
      
      // 如果配置存在且有prompt字段，使用自定义提示词
      if (setting && setting.payload && setting.payload.prompt) {
        logger.info('使用自定义提示词', { fileType: this.fileType, settingType });
        return setting.payload.prompt;
      }
      
      // 否则使用默认提示词
      logger.info('使用默认提示词', { fileType: this.fileType });
      return this.getDefaultPrompt();
    } catch (error) {
      logger.error('获取提示词配置失败，使用默认提示词', error);
      return this.getDefaultPrompt();
    }
  }

  /**
   * 获取默认提示词
   */
  protected getDefaultPrompt(): string {
    if (this.fileType === 'knowledge_base') {
      return `你是一个专业的知识库解析助手。请将用户提供的文件内容解析为结构化的知识数据。

要求：
1. 提取知识点标题和内容
2. 识别知识点的层级关系
3. 返回JSON格式数据，格式如下：
{
  "questions": [
    {
      "type": "essay",
      "content": "知识点标题",
      "answer": "知识点详细内容",
      "explanation": "补充说明",
      "tags": ["标签1", "标签2"]
    }
  ]
}

注意事项：
- 知识库统一使用essay类型
- content为知识点标题
- answer为知识点详细内容
- 确保返回的是合法的JSON格式`;
    }
    
    return `你是一个专业的题库解析助手。请将该文件内容解析为结构化的题目数据。
要求：
1. 识别题目类型：单选题(single)、多选题(multiple)、判断题(judge)、填空题(fill)、问答题(essay)
2. 提取题目内容、选项、答案、解析等信息
3. 返回JSON格式数据，格式如下：
{
  "questions": [
    {
      "type": "single",
      "content": "题目内容",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "A",
      "explanation": "解析内容",
      "difficulty": 1,
      "tags": ["标签1", "标签2"]
    }
  ]
}

注意事项：
- type必须是：single、multiple、judge、fill、essay之一
- 单选题和多选题必须有options数组
- 判断题的answer应该是"正确"或"错误"
- difficulty取值1-3，分别代表简单、中等、困难`;
  }

  /**
   * 构建用户提示词
   */
  protected buildUserPrompt(fileContentResult: FileContentResult, fileName: string): string {
    if (fileContentResult.type === 'text') {
      return `请解析以下文件内容：

文件名：${fileName}
文件内容：
${fileContentResult.content}

请按照JSON格式返回解析结果。`;
    } else {
      // 对于base64内容，提示词会在具体策略中构建
      return `请解析文件：${fileName}`;
    }
  }
}
