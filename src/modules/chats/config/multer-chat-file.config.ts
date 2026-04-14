import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

// Accepted MIME types by category
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
const DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export const multerChatFileConfig = {
    storage: diskStorage({
        destination: './public/uploads/chats',
        filename: (_req, file, cb) => {
            const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
            cb(null, uniqueName);
        },
    }),
    fileFilter: (_req, file, cb) => {
        const allowed = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOC_TYPES];
        if (!allowed.includes(file.mimetype)) {
            return cb(
                new BadRequestException(
                    'Unsupported file type. Allowed: images, videos, PDF, Word, Excel, text, zip.',
                ),
                false,
            );
        }
        cb(null, true);
    },
    limits: { fileSize: MAX_FILE_SIZE },
};

/** Derive ChatMessageType from MIME type */
export function mimeToMessageType(mime: string): 'image' | 'video' | 'file' {
    if (IMAGE_TYPES.includes(mime)) return 'image';
    if (VIDEO_TYPES.includes(mime)) return 'video';
    return 'file';
}
