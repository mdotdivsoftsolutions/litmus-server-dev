"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFile = exports.uploadFile = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const spaces_1 = __importDefault(require("../config/spaces"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const uploadFile = async (req, res) => {
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
        const uniqueSuffix = crypto_1.default.randomBytes(8).toString('hex');
        const ext = path_1.default.extname(req.file.originalname);
        const filename = `litmus_uploads/${Date.now()}-${uniqueSuffix}${ext}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: 'public-read',
        });
        await spaces_1.default.send(command);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to upload file',
            error: error.message,
        });
    }
};
exports.uploadFile = uploadFile;
const downloadFile = async (req, res) => {
    try {
        const fileUrl = String(req.query.url || '');
        const requestedName = String(req.query.name || 'document');
        if (!fileUrl) {
            res.status(400).json({ success: false, message: 'File URL is required' });
            return;
        }
        const user = await User_1.default.findById(req.user?.id).select('documents');
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
        const obj = await spaces_1.default.send(new client_s3_1.GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        }));
        if (!obj.Body) {
            res.status(404).json({ success: false, message: 'File not found' });
            return;
        }
        const bytes = await obj.Body.transformToByteArray();
        const ext = path_1.default.extname(key);
        const baseName = requestedName.replace(/[\r\n"]/g, '_').trim() || 'document';
        const filename = path_1.default.extname(baseName) ? baseName : `${baseName}${ext}`;
        const encoded = encodeURIComponent(filename);
        res.setHeader('Content-Type', obj.ContentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);
        res.setHeader('Content-Length', String(bytes.byteLength));
        res.setHeader('Cache-Control', 'no-store');
        res.send(Buffer.from(bytes));
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to download file',
            error: error.message,
        });
    }
};
exports.downloadFile = downloadFile;
