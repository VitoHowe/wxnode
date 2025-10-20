import path from 'path';

/**
 * 文件类型分类
 */
export enum FileCategory {
  DOCUMENTS_PDF = 'documents/pdf',
  DOCUMENTS_WORD = 'documents/word',
  DOCUMENTS_TEXT = 'documents/text',
  SPREADSHEETS = 'spreadsheets',
  IMAGES = 'images',
  OTHERS = 'others',
}

/**
 * 业务类型
 */
export type BusinessType = 'question_bank' | 'knowledge_base';

/**
 * 文件类型映射器
 */
export class FileTypeMapper {
  /**
   * MIME类型到文件分类的映射
   */
  private static readonly MIME_TYPE_MAP: Record<string, FileCategory> = {
    // PDF
    'application/pdf': FileCategory.DOCUMENTS_PDF,
    
    // Word文档
    'application/msword': FileCategory.DOCUMENTS_WORD,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileCategory.DOCUMENTS_WORD,
    
    // 文本文档
    'text/plain': FileCategory.DOCUMENTS_TEXT,
    'text/markdown': FileCategory.DOCUMENTS_TEXT,
    
    // 表格
    'application/vnd.ms-excel': FileCategory.SPREADSHEETS,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileCategory.SPREADSHEETS,
    'text/csv': FileCategory.SPREADSHEETS,
    
    // 图片
    'image/jpeg': FileCategory.IMAGES,
    'image/jpg': FileCategory.IMAGES,
    'image/png': FileCategory.IMAGES,
    'image/gif': FileCategory.IMAGES,
    'image/bmp': FileCategory.IMAGES,
    'image/webp': FileCategory.IMAGES,
    
    // JSON
    'application/json': FileCategory.OTHERS,
  };

  /**
   * 扩展名到文件分类的映射（备用）
   */
  private static readonly EXTENSION_MAP: Record<string, FileCategory> = {
    // PDF
    '.pdf': FileCategory.DOCUMENTS_PDF,
    
    // Word
    '.doc': FileCategory.DOCUMENTS_WORD,
    '.docx': FileCategory.DOCUMENTS_WORD,
    
    // 文本
    '.txt': FileCategory.DOCUMENTS_TEXT,
    '.md': FileCategory.DOCUMENTS_TEXT,
    
    // 表格
    '.xls': FileCategory.SPREADSHEETS,
    '.xlsx': FileCategory.SPREADSHEETS,
    '.csv': FileCategory.SPREADSHEETS,
    
    // 图片
    '.jpg': FileCategory.IMAGES,
    '.jpeg': FileCategory.IMAGES,
    '.png': FileCategory.IMAGES,
    '.gif': FileCategory.IMAGES,
    '.bmp': FileCategory.IMAGES,
    '.webp': FileCategory.IMAGES,
    
    // JSON
    '.json': FileCategory.OTHERS,
  };

  /**
   * 根据MIME类型和文件名获取文件分类
   * @param mimeType MIME类型
   * @param filename 文件名
   * @returns 文件分类
   */
  static getFileCategory(mimeType: string, filename: string): FileCategory {
    // 优先使用MIME类型匹配
    if (this.MIME_TYPE_MAP[mimeType]) {
      return this.MIME_TYPE_MAP[mimeType];
    }

    // 使用扩展名匹配
    const ext = path.extname(filename).toLowerCase();
    if (this.EXTENSION_MAP[ext]) {
      return this.EXTENSION_MAP[ext];
    }

    // 默认分类
    return FileCategory.OTHERS;
  }

  /**
   * 获取完整的存储路径
   * @param businessType 业务类型
   * @param mimeType MIME类型
   * @param filename 文件名
   * @returns 相对于uploadFile的路径
   */
  static getStoragePath(businessType: BusinessType, mimeType: string, filename: string): string {
    const category = this.getFileCategory(mimeType, filename);
    return path.join(businessType, category);
  }

  /**
   * 生成唯一文件名
   * @param originalFilename 原始文件名
   * @returns 唯一文件名
   */
  static generateUniqueFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    return `file-${timestamp}-${random}${ext}`;
  }
}
