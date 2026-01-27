import fs from 'fs';
import path from 'path';
import { query } from '@/config/database';
import { extractImageReferences } from '@/utils/imageParser';
import { ConflictError, NotFoundError, ValidationError } from '@/middleware/errorHandler';

export interface BankImageItem {
  filename: string;
  url: string;
  size: number;
  last_modified: string;
  used_in_questions: number[];
}

export interface UploadImageResult {
  uploaded: Array<{ filename: string; url: string; size: number }>;
  skipped: Array<{ filename: string; reason: string }>;
  total_uploaded: number;
}

class QuestionBankImageService {
  private async ensureBankExists(bankId: number): Promise<void> {
    const rows = await query(`SELECT id FROM question_banks WHERE id = ? LIMIT 1`, [bankId]);
    if (rows.length === 0) {
      throw new NotFoundError('题库不存在');
    }
  }

  private getImagesDir(bankId: number): string {
    return path.join(process.cwd(), 'public', 'question-banks', String(bankId), 'images');
  }

  private sanitizeFilename(filename: string): string {
    const baseName = path.basename(filename);
    return baseName.replace(/[\\/:*?"<>|]/g, '_');
  }

  private collectQuestionImages(question: any): string[] {
    const images: string[] = [];
    if (typeof question?.content === 'string') {
      images.push(...extractImageReferences(question.content));
    }
    if (typeof question?.explanation === 'string') {
      images.push(...extractImageReferences(question.explanation));
    }
    if (typeof question?.answer === 'string') {
      images.push(...extractImageReferences(question.answer));
    }
    if (Array.isArray(question?.options)) {
      for (const option of question.options) {
        if (typeof option === 'string') {
          images.push(...extractImageReferences(option));
        }
      }
    } else if (typeof question?.options === 'string') {
      images.push(...extractImageReferences(question.options));
    }
    return images;
  }

  private async buildUsageMap(bankId: number): Promise<Map<string, number[]>> {
    const rows = await query(
      `SELECT id, content, explanation, answer, options FROM questions WHERE bank_id = ?`,
      [bankId]
    );

    const usageMap = new Map<string, Set<number>>();
    for (const row of rows as Array<any>) {
      const images = this.collectQuestionImages(row);
      for (const filename of images) {
        if (!usageMap.has(filename)) {
          usageMap.set(filename, new Set<number>());
        }
        usageMap.get(filename)!.add(row.id);
      }
    }

    const result = new Map<string, number[]>();
    for (const [filename, ids] of usageMap.entries()) {
      result.set(filename, Array.from(ids));
    }
    return result;
  }

  async listImages(bankId: number, baseUrl?: string): Promise<{ images: BankImageItem[]; total: number }> {
    await this.ensureBankExists(bankId);
    const dir = this.getImagesDir(bankId);
    const usageMap = await this.buildUsageMap(bankId);
    const normalizedBaseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : '';

    if (!fs.existsSync(dir)) {
      return { images: [], total: 0 };
    }

    const files = fs.readdirSync(dir);
    const images: BankImageItem[] = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      const used = usageMap.get(file) || [];
      const relativeUrl = `/api/question-banks/${bankId}/images/${encodeURIComponent(file)}`;
      const resolvedUrl = normalizedBaseUrl ? `${normalizedBaseUrl}${relativeUrl}` : relativeUrl;
      images.push({
        filename: file,
        url: resolvedUrl,
        size: stat.size,
        last_modified: stat.mtime.toISOString(),
        used_in_questions: used,
      });
    }

    images.sort((a, b) => a.filename.localeCompare(b.filename));
    return { images, total: images.length };
  }

  async uploadImages(
    bankId: number,
    files: Express.Multer.File[],
    options?: { overwrite?: boolean }
  ): Promise<UploadImageResult> {
    await this.ensureBankExists(bankId);
    if (!files || files.length === 0) {
      throw new ValidationError('请先选择图片文件');
    }

    const dir = this.getImagesDir(bankId);
    await fs.promises.mkdir(dir, { recursive: true });
    const overwrite = !!options?.overwrite;

    const uploaded: Array<{ filename: string; url: string; size: number }> = [];
    const skipped: Array<{ filename: string; reason: string }> = [];

    for (const file of files) {
      const safeName = this.sanitizeFilename(file.originalname || file.filename || '');
      if (!safeName) {
        skipped.push({ filename: file.originalname || 'unknown', reason: '文件名无效' });
        continue;
      }

      const targetPath = path.join(dir, safeName);
      if (fs.existsSync(targetPath) && !overwrite) {
        skipped.push({ filename: safeName, reason: '文件已存在' });
        continue;
      }

      await fs.promises.writeFile(targetPath, file.buffer);
      uploaded.push({
        filename: safeName,
        url: `/api/question-banks/${bankId}/images/${encodeURIComponent(safeName)}`,
        size: file.size,
      });
    }

    return {
      uploaded,
      skipped,
      total_uploaded: uploaded.length,
    };
  }

  async renameImage(
    bankId: number,
    filename: string,
    newFilename: string,
    options?: { overwrite?: boolean }
  ): Promise<{ oldFilename: string; newFilename: string; updatedQuestions: number }> {
    await this.ensureBankExists(bankId);
    const safeOld = this.sanitizeFilename(filename);
    const safeNew = this.sanitizeFilename(newFilename);
    if (!safeOld || !safeNew) {
      throw new ValidationError('文件名不能为空');
    }

    const dir = this.getImagesDir(bankId);
    const oldPath = path.join(dir, safeOld);
    const newPath = path.join(dir, safeNew);
    if (!fs.existsSync(oldPath)) {
      throw new NotFoundError('图片不存在');
    }
    if (safeOld === safeNew) {
      return { oldFilename: safeOld, newFilename: safeNew, updatedQuestions: 0 };
    }
    if (fs.existsSync(newPath) && !options?.overwrite) {
      throw new ConflictError('目标文件已存在');
    }

    if (fs.existsSync(newPath) && options?.overwrite) {
      await fs.promises.unlink(newPath);
    }
    await fs.promises.rename(oldPath, newPath);

    const oldToken = `\${images/${safeOld}}`;
    const newToken = `\${images/${safeNew}}`;

    const rows = await query(
      `SELECT id, content, explanation, answer, options FROM questions WHERE bank_id = ?`,
      [bankId]
    );

    let updatedQuestions = 0;
    for (const row of rows as Array<any>) {
      let changed = false;
      const payload: Record<string, any> = {};

      const replaceToken = (value: any): any => {
        if (typeof value !== 'string') return value;
        if (!value.includes(oldToken)) return value;
        return value.split(oldToken).join(newToken);
      };

      const nextContent = replaceToken(row.content);
      if (nextContent !== row.content) {
        payload.content = nextContent;
        changed = true;
      }

      const nextExplanation = replaceToken(row.explanation);
      if (nextExplanation !== row.explanation) {
        payload.explanation = nextExplanation;
        changed = true;
      }

      const nextAnswer = replaceToken(row.answer);
      if (nextAnswer !== row.answer) {
        payload.answer = nextAnswer;
        changed = true;
      }

      if (row.options !== undefined && row.options !== null) {
        let optionsValue = row.options;
        try {
          if (typeof optionsValue === 'string') {
            optionsValue = JSON.parse(optionsValue);
          }
        } catch (_error) {
          // ignore parse error, treat as plain string
        }

        let nextOptions = optionsValue;
        if (Array.isArray(optionsValue)) {
          nextOptions = optionsValue.map((option: any) =>
            typeof option === 'string' ? replaceToken(option) : option
          );
        } else if (typeof optionsValue === 'string') {
          nextOptions = replaceToken(optionsValue);
        }

        const normalizedCurrent = JSON.stringify(optionsValue);
        const normalizedNext = JSON.stringify(nextOptions);
        if (normalizedCurrent !== normalizedNext) {
          payload.options = normalizedNext;
          changed = true;
        }
      }

      if (changed) {
        const currentOptionsValue =
          row.options === null || row.options === undefined
            ? null
            : typeof row.options === 'string'
              ? row.options
              : JSON.stringify(row.options);
        await query(
          `UPDATE questions SET content = ?, explanation = ?, answer = ?, options = ?, updated_at = NOW() WHERE id = ?`,
          [
            payload.content ?? row.content,
            payload.explanation ?? row.explanation,
            payload.answer ?? row.answer,
            payload.options ?? currentOptionsValue,
            row.id,
          ]
        );
        updatedQuestions += 1;
      }
    }

    return { oldFilename: safeOld, newFilename: safeNew, updatedQuestions };
  }

  async deleteImage(
    bankId: number,
    filename: string,
    options?: { force?: boolean }
  ): Promise<{ deleted: boolean; usedInQuestions: number[] }> {
    await this.ensureBankExists(bankId);
    const safeName = this.sanitizeFilename(filename);
    const filePath = path.join(this.getImagesDir(bankId), safeName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('图片不存在');
    }

    const usageMap = await this.buildUsageMap(bankId);
    const usedInQuestions = usageMap.get(safeName) || [];
    if (usedInQuestions.length > 0 && !options?.force) {
      throw new ValidationError(`图片仍被题目引用，无法删除（引用题数：${usedInQuestions.length}）`);
    }

    await fs.promises.unlink(filePath);
    return { deleted: true, usedInQuestions };
  }
}

export const questionBankImageService = new QuestionBankImageService();
