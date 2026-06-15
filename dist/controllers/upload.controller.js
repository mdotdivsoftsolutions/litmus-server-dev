"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const spaces_1 = __importDefault(require("../config/spaces"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
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
