import fs from 'fs';
import path from 'path';
import { logger } from '@/utils/logger';

let cachedEssayRoot: string | null = null;

const resolvePath = (targetPath: string): string =>
  path.isAbsolute(targetPath) ? targetPath : path.join(process.cwd(), targetPath);

const collectCandidates = (): string[] => {
  const uploadBasePath = resolvePath(process.env.UPLOAD_PATH || './uploads');
  const explicitRoot = process.env.ESSAY_STORAGE_PATH?.trim();
  const candidates = [
    explicitRoot ? resolvePath(explicitRoot) : '',
    path.join(process.cwd(), 'public', 'question-banks', 'essays'),
    path.join(uploadBasePath, 'question-banks', 'essays'),
    path.join(uploadBasePath, 'essays'),
  ].filter(Boolean);

  return Array.from(new Set(candidates));
};

const ensureWritableDir = (targetPath: string): void => {
  fs.mkdirSync(targetPath, { recursive: true });
  fs.accessSync(targetPath, fs.constants.W_OK);
};

export const getEssayStorageRoot = (): string => {
  if (cachedEssayRoot) {
    try {
      ensureWritableDir(cachedEssayRoot);
      return cachedEssayRoot;
    } catch {
      cachedEssayRoot = null;
    }
  }

  const errors: string[] = [];
  const candidates = collectCandidates();

  for (const candidate of candidates) {
    try {
      ensureWritableDir(candidate);
      cachedEssayRoot = candidate;
      logger.info(`[EssayStorage] 使用论文存储目录: ${candidate}`);
      return candidate;
    } catch (error) {
      errors.push(`${candidate} (${(error as Error).message})`);
    }
  }

  throw new Error(`论文存储目录不可写: ${errors.join('; ')}`);
};

export const getEssayTempUploadDir = (): string => {
  const rootDir = getEssayStorageRoot();
  const tempDir = path.join(rootDir, 'tmp');
  ensureWritableDir(tempDir);
  return tempDir;
};

export const getEssayStorageDir = (essayId: number): string =>
  path.join(getEssayStorageRoot(), String(essayId));
