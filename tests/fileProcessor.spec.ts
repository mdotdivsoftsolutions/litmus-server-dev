import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import 'multer';
import { processUploadedFile, isProcessableImage } from '../src/utils/fileProcessor';

describe('fileProcessor Utility', () => {
  it('should identify processable image mime types', () => {
    expect(isProcessableImage('image/jpeg')).toBe(true);
    expect(isProcessableImage('image/png')).toBe(true);
    expect(isProcessableImage('image/webp')).toBe(true);
    expect(isProcessableImage('image/svg+xml')).toBe(false);
    expect(isProcessableImage('application/pdf')).toBe(false);
    expect(isProcessableImage('application/octet-stream')).toBe(false);
  });

  it('should pass non-image files through untouched', async () => {
    const fakePdfBuffer = Buffer.from('%PDF-1.4 ... mock pdf content ...');
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'report.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: fakePdfBuffer.length,
      buffer: fakePdfBuffer,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const result = await processUploadedFile(mockFile);

    expect(result.isImage).toBe(false);
    expect(result.mimetype).toBe('application/pdf');
    expect(result.ext).toBe('.pdf');
    expect(result.format).toBe('pdf');
    expect(result.buffer).toBe(fakePdfBuffer);
  });

  it('should convert PNG/JPEG images into optimized WebP', async () => {
    // Generate a simple test JPEG image using Sharp
    const testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'sample_photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: testImageBuffer.length,
      buffer: testImageBuffer,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const result = await processUploadedFile(mockFile);

    expect(result.isImage).toBe(true);
    expect(result.mimetype).toBe('image/webp');
    expect(result.ext).toBe('.webp');
    expect(result.format).toBe('webp');
    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify the output buffer is indeed valid WebP format
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('webp');
  });
});
