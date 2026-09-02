import path from 'path';
import sharp from 'sharp';
import 'multer';
import logger from './logger';

export interface ProcessedFileResult {
  buffer: Buffer;
  mimetype: string;
  ext: string;
  format: string;
  originalSize: number;
  processedSize: number;
  isImage: boolean;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  effort?: number;
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 82,
  effort: 4,
};

/**
 * Checks if a MIME type represents a raster image that Sharp can process.
 */
export const isProcessableImage = (mimetype: string): boolean => {
  if (!mimetype || !mimetype.startsWith('image/')) {
    return false;
  }
  // Exclude SVGs as they are XML vectors and shouldn't be rasterized to WebP unless specifically needed
  if (mimetype === 'image/svg+xml') {
    return false;
  }
  return true;
};

/**
 * Optimizes uploaded files:
 * - If image: Auto-rotates (EXIF), resizes within max bounds, converts to high-quality WebP, and compresses heavily.
 * - If document/PDF: Passes through the original buffer safely.
 */
export const processUploadedFile = async (
  file: Express.Multer.File,
  options?: ImageProcessingOptions
): Promise<ProcessedFileResult> => {
  const originalSize = file.size || file.buffer.length;
  const originalExt = path.extname(file.originalname);
  const originalFormat = originalExt.replace('.', '').toLowerCase() || 'bin';

  if (!isProcessableImage(file.mimetype)) {
    return {
      buffer: file.buffer,
      mimetype: file.mimetype,
      ext: originalExt,
      format: originalFormat,
      originalSize,
      processedSize: originalSize,
      isImage: false,
    };
  }

  const { maxWidth, maxHeight, quality, effort } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  try {
    const webpBuffer = await sharp(file.buffer)
      .rotate() // Automatically orient based on EXIF
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort,
      })
      .toBuffer();

    const processedSize = webpBuffer.length;
    const reductionPercent = originalSize > 0 
      ? (((originalSize - processedSize) / originalSize) * 100).toFixed(1)
      : '0';

    logger.info(
      `Image optimized to WebP: ${(originalSize / 1024).toFixed(1)} KB -> ${(processedSize / 1024).toFixed(1)} KB (${reductionPercent}% reduction)`
    );

    return {
      buffer: webpBuffer,
      mimetype: 'image/webp',
      ext: '.webp',
      format: 'webp',
      originalSize,
      processedSize,
      isImage: true,
    };
  } catch (error: any) {
    logger.warn(`Failed to convert image to WebP: ${error.message}. Fallback to original binary.`);
    return {
      buffer: file.buffer,
      mimetype: file.mimetype,
      ext: originalExt,
      format: originalFormat,
      originalSize,
      processedSize: originalSize,
      isImage: true,
    };
  }
};
