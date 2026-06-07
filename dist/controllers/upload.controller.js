"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
            return;
        }
        // Wrap the cloudinary upload stream in a promise
        const uploadStream = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({
                    folder: 'litmus_uploads',
                    resource_type: 'auto',
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                });
                stream.end(req.file?.buffer);
            });
        };
        const result = await uploadStream();
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
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
