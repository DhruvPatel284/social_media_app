import { BadRequestException, Injectable } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Injectable()
export class FileUploadInterceptor extends FileInterceptor('file', {
  storage: diskStorage({
    destination: './src/assets/products',
    filename: (req, file, callback) => {
      if (file) {
        callback(null, file.originalname);
      }
    },
  }),
  fileFilter: (req, file, callback) => {
    if (file) {
      if (!file.mimetype.match('(jpg|jpeg|png)$'))
        return callback(
          new BadRequestException('only jpg|jpeg|png allowed'),
          false,
        );
      callback(null, true);
    }
  },
}) {}
