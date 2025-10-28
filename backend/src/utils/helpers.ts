import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { BadRequestException } from '@nestjs/common';
import { CronTime } from 'cron';
import { RESERVED_KEYWORDS } from './constants';
import * as crypto from 'crypto';

const IV_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const buffer = Buffer.from(ENCRYPTION_KEY, 'utf8');

export function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv('aes-256-cbc', buffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string) {
  const [ivHex, encrypted] = text.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', buffer, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function validateCronExpression(expression: string): void {
  try {
    new CronTime(expression);
  } catch (error) {
    throw new BadRequestException(`Invalid Cron Expression : ${error.message}`);
  }
}

export function validateTableName(tableName: string): void {
  if (!/^[A-Z_]\w*$/i.test(tableName)) {
    throw new BadRequestException(
      `Invalid table name "${tableName}". Only letters, numbers, and underscores are allowed, and it must start with a letter or underscore.`,
    );
  }

  if (tableName.length > 63) {
    throw new BadRequestException(
      `Invalid table name "${tableName}". Must not exceed 63 characters.`,
    );
  }

  if (RESERVED_KEYWORDS.has(tableName.toLowerCase())) {
    throw new BadRequestException(
      `Invalid table name "${tableName}". It is a reserved SQL keyword.`,
    );
  }
}

export function validateFileType(filePath: string): 'CSV' | 'TSV' | 'JSON' {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');

  switch (ext) {
    case 'csv':
      return 'CSV';
    case 'tsv':
      return 'TSV';
    case 'json':
      return 'JSON';
    default:
      throw new Error(
        `Invalid file type: ${ext}. Only CSV, TSV, or JSON are allowed.`,
      );
  }
}

export function isValidText(text: string): boolean {
  return !/�{3,}/.test(text);
}
