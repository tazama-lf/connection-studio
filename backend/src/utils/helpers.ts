import { BadRequestException } from '@nestjs/common';
import { CronTime } from 'cron';
import * as path from 'path';
import { RESERVED_KEYWORDS } from './constants';



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
        throw new BadRequestException(`Invalid table name "${tableName}". Must not exceed 63 characters.`);
    }

    if (RESERVED_KEYWORDS.has(tableName.toLowerCase())) {
        throw new BadRequestException(`Invalid table name "${tableName}". It is a reserved SQL keyword.`);
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
