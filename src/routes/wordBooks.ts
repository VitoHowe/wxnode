import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest, validationSchemas } from '@/middleware/validation';
import { wordBookController } from '@/controllers/wordBookController';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const basePath = process.env.WORD_BOOK_UPLOAD_PATH || path.join(process.cwd(), 'uploads', 'word-books');
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
    cb(null, basePath);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const uniqueName = `${timestamp}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.json')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JSON word book files are supported.'));
  },
});

router.use(authenticateToken);

/**
 * @swagger
 * /api/word-books/upload:
 *   post:
 *     tags: [WordBooks]
 *     summary: Upload a word book JSON file
 *     description: Upload a JSON file to import a word book into the system.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JSON file containing word entries
 *               name:
 *                 type: string
 *                 description: Word book name (optional, defaults to file name)
 *               description:
 *                 type: string
 *                 description: Word book description
 *               language:
 *                 type: string
 *                 description: Language code (default zh-CN)
 *     responses:
 *       200:
 *         description: Upload succeeded
 *       400:
 *         description: Invalid params or file format
 *       401:
 *         description: Unauthorized
 */

router.post(
  '/upload',
  upload.single('file'),
  validateRequest(validationSchemas.wordBookUpload),
  wordBookController.uploadWordBook
);

/**
 * @swagger
 * /api/word-books:
 *   get:
 *     tags: [WordBooks]
 *     summary: List word books
 *     description: Return available word books for selection.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *           description: Filter by name or description
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           description: Filter by language code
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */

router.get('/', validateRequest(validationSchemas.wordBookList), wordBookController.listWordBooks);

/**
 * @swagger
 * /api/word-books/{id}/words:
 *   get:
 *     tags: [WordBooks]
 *     summary: Get words from a word book
 *     description: Return word entries for the specified book. Use all=1 to return all.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Word book not found
 */

router.get(
  '/:id/words',
  validateRequest(validationSchemas.wordBookEntriesQuery),
  wordBookController.getWordBookWords
);

/**
 * @swagger
 * /api/word-books/{id}/favorites:
 *   get:
 *     tags: [WordBooks]
 *     summary: List favorite words for a word book
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [WordBooks]
 *     summary: Add a word to favorites
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     tags: [WordBooks]
 *     summary: Remove a word from favorites
 *     security:
 *       - bearerAuth: []
 */

router.get(
  '/:id/favorites',
  validateRequest(validationSchemas.wordBookIdParams),
  wordBookController.listFavoriteWords
);
router.post(
  '/:id/favorites',
  validateRequest(validationSchemas.wordBookEntryAction),
  wordBookController.addFavoriteWord
);
router.delete(
  '/:id/favorites',
  validateRequest(validationSchemas.wordBookEntryAction),
  wordBookController.removeFavoriteWord
);

/**
 * @swagger
 * /api/word-books/{id}/wrong-words:
 *   get:
 *     tags: [WordBooks]
 *     summary: List wrong words for a word book
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [WordBooks]
 *     summary: Add a wrong word
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     tags: [WordBooks]
 *     summary: Remove a wrong word
 *     security:
 *       - bearerAuth: []
 */

router.get(
  '/:id/wrong-words',
  validateRequest(validationSchemas.wordBookIdParams),
  wordBookController.listWrongWords
);
router.post(
  '/:id/wrong-words',
  validateRequest(validationSchemas.wordBookEntryAction),
  wordBookController.addWrongWord
);
router.delete(
  '/:id/wrong-words',
  validateRequest(validationSchemas.wordBookEntryAction),
  wordBookController.removeWrongWord
);

/**
 * @swagger
 * /api/word-books/{id}/progress:
 *   get:
 *     tags: [WordBooks]
 *     summary: Get progress for a word book
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [WordBooks]
 *     summary: Save progress for a word book
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     tags: [WordBooks]
 *     summary: Reset progress for a word book
 *     security:
 *       - bearerAuth: []
 */

router.get(
  '/:id/progress',
  validateRequest(validationSchemas.wordBookIdParams),
  wordBookController.getWordBookProgress
);
router.post(
  '/:id/progress',
  validateRequest(validationSchemas.wordBookProgressUpsert),
  wordBookController.saveWordBookProgress
);
router.delete(
  '/:id/progress',
  validateRequest(validationSchemas.wordBookIdParams),
  wordBookController.resetWordBookProgress
);

export default router;
