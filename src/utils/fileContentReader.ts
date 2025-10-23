import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// 支持的图片格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

// 支持的文本格式
const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.csv'];

// PDF扩展名
const PDF_EXTENSION = '.pdf';

/**
 * 文件内容类型
 */
export type FileContentType = 'text' | 'base64' | 'base64_array';

/**
 * 文件内容结果
 */
export interface FileContentResult {
  type: FileContentType;
  content: string | string[];
  mimeType?: string;
}

/**
 * 文件内容读取器
 */
export class FileContentReader {
  /**
   * 读取文件内容，根据provider类型和文件类型返回不同格式
   * @param filePath 文件路径
   * @param providerType provider类型 (openai, gemini, qwen等)
   * @returns 文件内容结果
   */
  static async readFileContent(
    filePath: string,
    providerType: string
  ): Promise<FileContentResult> {
    const ext = path.extname(filePath).toLowerCase();
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 处理文本文件
    if (TEXT_EXTENSIONS.includes(ext)) {
      return this.readTextFile(filePath);
    }

    // 处理图片文件
    if (IMAGE_EXTENSIONS.includes(ext)) {
      return this.readImageFile(filePath, providerType);
    }

    // 处理PDF文件
    if (ext === PDF_EXTENSION) {
      return this.readPDFFile(filePath, providerType);
    }

    // 默认按文本处理
    logger.warn(`未知文件类型: ${ext}, 尝试按文本文件处理`);
    return this.readTextFile(filePath);
  }

  /**
   * 读取文本文件
   */
  private static async readTextFile(filePath: string): Promise<FileContentResult> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          reject(new Error(`文件读取失败: ${err.message}`));
        } else {
          const ext = path.extname(filePath).toLowerCase();
          const mimeType = this.getMimeType(ext);
          
          resolve({
            type: 'text',
            content: data,
            mimeType,
          });
        }
      });
    });
  }

  /**
   * 读取图片文件并转换为base64
   */
  private static async readImageFile(
    filePath: string,
    providerType: string
  ): Promise<FileContentResult> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          reject(new Error(`图片读取失败: ${err.message}`));
        } else {
          const base64 = data.toString('base64');
          const ext = path.extname(filePath).toLowerCase();
          const mimeType = this.getMimeType(ext);
          
          resolve({
            type: 'base64',
            content: base64,
            mimeType,
          });
        }
      });
    });
  }

  /**
   * 读取PDF文件
   * - OpenAI格式: 将PDF每一页转换为JPG，然后转换为base64数组
   * - Gemini格式: 直接将PDF转换为base64
   */
  private static async readPDFFile(
    filePath: string,
    providerType: string
  ): Promise<FileContentResult> {
    if (providerType === 'openai' || providerType === 'qwen') {
      // OpenAI和Qwen格式：PDF转图片再转base64
      return this.convertPDFToImages(filePath);
    } else if (providerType === 'gemini') {
      // Gemini格式：PDF直接转base64
      return this.convertPDFToBase64(filePath);
    } else {
      // 其他provider默认使用Gemini格式
      logger.warn(`未知的provider类型: ${providerType}, 使用Gemini格式处理PDF`);
      return this.convertPDFToBase64(filePath);
    }
  }

  /**
   * 将PDF直接转换为base64（用于Gemini）
   */
  private static async convertPDFToBase64(filePath: string): Promise<FileContentResult> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          reject(new Error(`PDF读取失败: ${err.message}`));
        } else {
          const base64 = data.toString('base64');
          resolve({
            type: 'base64',
            content: base64,
            mimeType: 'application/pdf',
          });
        }
      });
    });
  }

  /**
   * 将PDF转换为图片数组（用于OpenAI）
   * 使用pdf-to-img库将PDF的每一页转换为PNG图片，然后转换为base64数组
   */
  private static async convertPDFToImages(filePath: string): Promise<FileContentResult> {
    try {
      logger.info(`开始将PDF转换为图片: ${filePath}`);
      
      const base64Images: string[] = [];
      
      // 动态导入 pdf-to-img (ESM 模块)
      const { pdf } = await import('pdf-to-img');
      
      // 使用pdf-to-img转换PDF
      const document = await pdf(filePath, {
        scale: 2.0, // 提高分辨率以获得更好的OCR效果
      });
      
      let pageCount = 0;
      
      // 遍历每一页，转换为base64
      for await (const image of document) {
        pageCount++;
        // image是一个Buffer，直接转换为base64
        const base64 = image.toString('base64');
        base64Images.push(base64);
        
        logger.debug(`已转换PDF第${pageCount}页`);
      }
      
      logger.info(`PDF转换完成，共${pageCount}页`);
      
      // 如果只有一页，返回单个base64
      if (base64Images.length === 1) {
        return {
          type: 'base64',
          content: base64Images[0],
          mimeType: 'image/png',
        };
      }
      
      // 多页返回数组
      return {
        type: 'base64_array',
        content: base64Images,
        mimeType: 'image/png',
      };
    } catch (error: any) {
      logger.error(`PDF转图片失败: ${error.message}`);
      
      // 如果转换失败，降级为直接返回PDF的base64
      logger.warn('PDF转图片失败，降级为直接返回PDF的base64格式');
      return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
          if (err) {
            reject(new Error(`PDF读取失败: ${err.message}`));
          } else {
            const base64 = data.toString('base64');
            resolve({
              type: 'base64',
              content: base64,
              mimeType: 'application/pdf',
            });
          }
        });
      });
    }
  }

  /**
   * 获取文件的MIME类型
   */
  private static getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      // 图片格式
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      // 文档格式
      '.pdf': 'application/pdf',
      // 文本格式
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.csv': 'text/csv',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
