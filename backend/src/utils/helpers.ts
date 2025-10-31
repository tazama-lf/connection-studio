import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { BadRequestException } from '@nestjs/common';
import { CronTime } from 'cron';
import { RESERVED_KEYWORDS } from './constants';
import * as crypto from 'crypto';

const IV_LENGTH = parseInt(process.env.IV_LENGTH!);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const key = Buffer.from(ENCRYPTION_KEY, 'utf8');

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error('Failed to encrypt sensitive data');
  }
}

export function decrypt(text: string): string {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt sensitive data');
  }
}

const encryptedText = encrypt('password');
console.log("ENCRYPTED TEXT", encryptedText);

const decryptedText = decrypt(encryptedText);
console.log("DECRYPTED TEXT", decryptedText);



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
