import { IsEnum, IsOptional } from 'class-validator';
import { ContentType } from './interfaces';

export class FileUploadDto {
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  description?: string;
}

export interface ParsedFileResult {
  content: string;
  contentType: ContentType;
  originalName: string;
  size: number;
}
