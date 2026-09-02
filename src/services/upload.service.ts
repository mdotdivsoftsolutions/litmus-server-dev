import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import spacesClient from '../config/spaces';
import User from '../models/User';
import { processUploadedFile } from '../utils/fileProcessor';

export interface UploadResult {
  url: string;
  public_id: string;
  format: string;
  originalSize: number;
  processedSize: number;
}

export class UploadService {
  /**
   * Processes the file (converts images to optimized WebP) and uploads to object storage.
   */
  public static async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    const bucketName = process.env.DO_SPACES_NAME;
    const endpoint = process.env.DO_SPACES_ENDPOINT;

    if (!bucketName || !endpoint) {
      throw new Error('Storage configuration missing (DO_SPACES_NAME or DO_SPACES_ENDPOINT)');
    }

    // Process file (compress & convert image to WebP if applicable)
    const processed = await processUploadedFile(file);

    // Generate unique filename with processed extension (.webp for images)
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const filename = `litmus_uploads/${Date.now()}-${uniqueSuffix}${processed.ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: processed.buffer,
      ContentType: processed.mimetype,
      ACL: 'public-read',
    });

    await spacesClient.send(command);

    // Construct the public URL
    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    const url = `https://${bucketName}.${cleanEndpoint}/${filename}`;

    return {
      url,
      public_id: filename,
      format: processed.format,
      originalSize: processed.originalSize,
      processedSize: processed.processedSize,
    };
  }

  /**
   * Verifies user authorization to download a document.
   */
  public static async checkUserDocumentAccess(userId: string, fileUrl: string): Promise<boolean> {
    const user = await User.findById(userId).select('documents');
    return Boolean(user?.documents?.some((d) => d.url === fileUrl));
  }

  /**
   * Fetches an object stream / buffer from object storage.
   */
  public static async getFileObject(key: string) {
    const bucketName = process.env.DO_SPACES_NAME;
    if (!bucketName) {
      throw new Error('Storage configuration missing (DO_SPACES_NAME)');
    }

    return await spacesClient.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
  }
}
