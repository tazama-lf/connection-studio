import { BadRequestException } from '@nestjs/common';
import { CronTime } from 'cron';
import * as path from 'path';

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
            throw new Error(`Invalid file type: ${ext}. Only CSV, TSV, or JSON are allowed.`);
    }
}
