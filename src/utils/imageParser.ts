/**
 * 图片引用解析工具
 * 处理题目中的 ${images/xxx.jpg} 格式的图片引用
 */

export interface ImageReference {
  placeholder: string;  // 原始占位符，如 ${images/xxx.jpg}
  filename: string;     // 文件名，如 xxx.jpg
  url: string;          // 完整URL
}

/**
 * 从文本中提取所有图片引用
 * @param text 包含图片引用的文本
 * @returns 图片引用数组
 */
export const extractImageReferences = (text: string): string[] => {
  if (!text) return [];
  
  const regex = /\$\{images\/([^}]+)\}/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);  // match[1] 是文件名
  }
  
  return matches;
};

/**
 * 替换文本中的图片引用为完整URL
 * @param text 包含图片引用的文本
 * @param bankId 题库ID
 * @param baseUrl API基础URL（可选，默认空）
 * @returns 替换后的文本
 */
export const replaceImageReferences = (
  text: string,
  bankId: number,
  baseUrl: string = ''
): string => {
  if (!text) return text;
  
  return text.replace(/\$\{images\/([^}]+)\}/g, (match, filename) => {
    return `${baseUrl}/api/question-banks/${bankId}/images/${filename}`;
  });
};

/**
 * 解析题目对象中的所有图片引用
 * @param question 题目对象
 * @returns 该题目使用的所有图片文件名
 */
export const extractQuestionImages = (question: any): string[] => {
  const images: string[] = [];
  
  // 从题目内容中提取
  if (question.content) {
    images.push(...extractImageReferences(question.content));
  }
  
  // 从解析中提取
  if (question.explanation) {
    images.push(...extractImageReferences(question.explanation));
  }
  
  // 去重
  return Array.from(new Set(images));
};

/**
 * 替换题目对象中的所有图片引用
 * @param question 题目对象
 * @param bankId 题库ID
 * @param baseUrl API基础URL（可选）
 * @returns 处理后的题目对象
 */
export const replaceQuestionImages = (
  question: any,
  bankId: number,
  baseUrl: string = ''
): any => {
  const processed = { ...question };
  
  if (processed.content) {
    processed.content = replaceImageReferences(processed.content, bankId, baseUrl);
  }
  
  if (processed.explanation) {
    processed.explanation = replaceImageReferences(processed.explanation, bankId, baseUrl);
  }
  
  return processed;
};
