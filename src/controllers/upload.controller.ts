import { Request, Response } from 'express';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import spacesClient from '../config/spaces';
import crypto from 'crypto';
import path from 'path';
import User from '../models/User';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const bucketName = process.env.DO_SPACES_NAME;
    const endpoint = process.env.DO_SPACES_ENDPOINT;
    
    if (!bucketName || !endpoint) {
      res.status(500).json({
        success: false,
        message: 'Storage configuration missing',
      });
      return;
    }

    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(req.file.originalname);
    const filename = `litmus_uploads/${Date.now()}-${uniqueSuffix}${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    });

    await spacesClient.send(command);

    // Construct the URL
    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    const url = `https://${bucketName}.${cleanEndpoint}/${filename}`;

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: url,
        public_id: filename,
        format: ext.replace('.', ''),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message,
    });
  }
};

export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileUrl = String(req.query.url || '');
    const requestedName = String(req.query.name || 'document');

    if (!fileUrl) {
      res.status(400).json({ success: false, message: 'File URL is required' });
      return;
    }

    const user = await User.findById(req.user?.id).select('documents');
    const owned = user?.documents?.some((d) => d.url === fileUrl);
    if (!owned) {
      res.status(403).json({ success: false, message: 'Document not found' });
      return;
    }

    const bucketName = process.env.DO_SPACES_NAME;
    if (!bucketName) {
      res.status(500).json({ success: false, message: 'Storage configuration missing' });
      return;
    }

    const parsed = new URL(fileUrl);
    const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!key.startsWith('litmus_uploads/')) {
      res.status(400).json({ success: false, message: 'Invalid file URL' });
      return;
    }

    const obj = await spacesClient.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    if (!obj.Body) {
      res.status(404).json({ success: false, message: 'File not found' });
      return;
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message,
    });
  }
};
