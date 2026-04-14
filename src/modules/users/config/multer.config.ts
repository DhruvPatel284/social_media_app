import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

// Allowed image types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Max file size: 2MB for profile images
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export const userProfileImageConfig = {
  storage: diskStorage({
    destination: './public/uploads/users',
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
        ),
        false,
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};