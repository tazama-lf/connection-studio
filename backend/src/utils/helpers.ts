import { BadRequestException } from '@nestjs/common';
import { CronTime } from 'cron';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
  } catch {
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
  } catch {
    throw new Error('Failed to decrypt sensitive data');
  }
}

export function validateCronExpression(expression: string): void {
  try {
    new CronTime(expression);
  } catch (error) {
    throw new BadRequestException(`Invalid Cron Expression : ${error.message}`);
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
