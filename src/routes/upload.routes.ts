import { Router } from 'express';
import multer from 'multer';
import { uploadFile, downloadFile } from '../controllers/upload.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Configure multer to use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // Limit file size to 50MB
  },
});

// Protect the upload route
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload a file (images are auto-compressed and converted to WebP; docs/PDFs preserved)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     public_id:
 *                       type: string
 *                     format:
 *                       type: string
 *                     originalSize:
 *                       type: number
 *                     processedSize:
 *                       type: number
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Server or storage error
 */
router.post('/', upload.single('file'), uploadFile);

/**
 * @swagger
 * /api/v1/upload/download:
 *   get:
 *     summary: Download a secure document owned by the authenticated user
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: Full URL of the stored file
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Optional custom filename for download
 *     responses:
 *       200:
 *         description: Binary file stream
 *       400:
 *         description: Invalid or missing file URL
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied or document not owned
 *       404:
 *         description: File not found
 */
router.get('/download', downloadFile);

export default router;
