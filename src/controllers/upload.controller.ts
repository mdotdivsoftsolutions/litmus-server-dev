import { Request, Response } from 'express';
import path from 'path';
import { UploadService } from '../services/upload.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export const uploadFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  const result = await UploadService.uploadFile(req.file);

  res.status(200).json(
    ApiResponse.success(
      {
        url: result.url,
        public_id: result.public_id,
        format: result.format,
        originalSize: result.originalSize,
        processedSize: result.processedSize,
      },
      'File uploaded successfully'
    )
  );
});

export const downloadFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const fileUrl = String(req.query.url || '');
  const requestedName = String(req.query.name || 'document');

  if (!fileUrl) {
    throw new ApiError(400, 'File URL is required');
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const isAuthorized = await UploadService.checkUserDocumentAccess(userId, fileUrl);
  if (!isAuthorized) {
    throw new ApiError(403, 'Document not found or access denied');
  }

  const parsed = new URL(fileUrl);
  const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!key.startsWith('litmus_uploads/')) {
    throw new ApiError(400, 'Invalid file URL');
  }

  const obj = await UploadService.getFileObject(key);

  if (!obj.Body) {
    throw new ApiError(404, 'File not found');
  }

  const bytes = await obj.Body.transformToByteArray();
  const ext = path.extname(key);
  const baseName = requestedName.replace(/[\r\n"]/g, '_').trim() || 'document';
  const filename = path.extname(baseName) ? baseName : `${baseName}${ext}`;
  const encoded = encodeURIComponent(filename);

  res.setHeader('Content-Type', obj.ContentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);
  res.setHeader('Content-Length', String(bytes.byteLength));
  res.setHeader('Cache-Control', 'no-store');
  res.send(Buffer.from(bytes));
});
