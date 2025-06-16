import { extname } from 'path';

import { Request } from 'express';
import { diskStorage } from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
      callback(new Error('Unsupported file type'), false);
      return;
    }
    callback(null, true);
  },
};
