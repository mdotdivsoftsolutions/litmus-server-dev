import { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import spacesClient from '../config/spaces';
import crypto from 'crypto';
import path from 'path';

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
