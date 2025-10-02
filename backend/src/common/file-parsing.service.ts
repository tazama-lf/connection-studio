import { Injectable, BadRequestException } from '@nestjs/common';
import { ContentType } from '../common/interfaces';
import { ParsedFileResult } from '../common/dto';

@Injectable()
export class FileParsingService {
  parseUploadedFile(
    file: Express.Multer.File,
    expectedContentType: ContentType,
  ): ParsedFileResult {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const content = file.buffer.toString('utf8');

    const isValidFile = this.validateFileType(
      file,
      expectedContentType,
      content,
    );
    if (!isValidFile.isValid) {
      throw new BadRequestException(isValidFile.error);
    }

    return {
      content,
      contentType: expectedContentType,
      originalName: file.originalname,
      size: file.size,
    };
  }

  private validateFileType(
    file: Express.Multer.File,
    expectedContentType: ContentType,
    content: string,
  ): { isValid: boolean; error?: string } {
    const filename = file.originalname.toLowerCase();

    if (expectedContentType === ContentType.JSON) {
      if (!filename.endsWith('.json')) {
        return {
          isValid: false,
          error: 'File must have .json extension for JSON content type',
        };
      }

      try {
        JSON.parse(content);
      } catch (error) {
        return {
          isValid: false,
          error: `Invalid JSON format: ${error.message}`,
        };
      }
    } else if (expectedContentType === ContentType.XML) {
      if (!filename.endsWith('.xml')) {
        return {
          isValid: false,
          error: 'File must have .xml extension for XML content type',
        };
      }

      if (!content.trim().startsWith('<') || !content.trim().endsWith('>')) {
        return {
          isValid: false,
          error: 'Invalid XML format: must start with < and end with >',
        };
      }
    }

    return { isValid: true };
  }

  detectContentType(file: Express.Multer.File): ContentType {
    const filename = file.originalname.toLowerCase();
    const content = file.buffer.toString('utf8').trim();

    if (filename.endsWith('.json')) {
      return ContentType.JSON;
    }

    if (filename.endsWith('.xml')) {
      return ContentType.XML;
    }

    if (content.startsWith('{') || content.startsWith('[')) {
      return ContentType.JSON;
    }

    if (content.startsWith('<')) {
      return ContentType.XML;
    }

    return ContentType.JSON;
  }

  static getAllowedMimeTypes(): string[] {
    return [
      'application/json',
      'text/json',
      'application/xml',
      'text/xml',
      'text/plain', // Allow plain text files that might contain JSON/XML
    ];
  }
}
