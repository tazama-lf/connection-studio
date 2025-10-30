import { Injectable } from '@nestjs/common';
import {
  parseUploadedFile,
  validateFileType,
  detectContentType,
  getAllowedMimeTypes,
} from '@tazama-lf/tcs-lib';
import { ContentType, ParsedFileResult } from '@tazama-lf/tcs-lib';

@Injectable()
export class FileParsingService {
  parseUploadedFile(
    file: Express.Multer.File,
    expectedContentType: ContentType,
  ): ParsedFileResult {
    return parseUploadedFile(file, expectedContentType);
  }

  validateFileType(
    file: Express.Multer.File,
    expectedContentType: ContentType,
    content: string,
  ): { isValid: boolean; error?: string } {
    return validateFileType(file, expectedContentType, content);
  }

  detectContentType(file: Express.Multer.File): ContentType {
    return detectContentType(file);
  }

  getAllowedMimeTypes(): string[] {
    return getAllowedMimeTypes();
  }
}
