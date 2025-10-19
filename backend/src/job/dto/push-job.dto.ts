import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { IngestMode } from '../../utils/interfaces';
import { Expose } from 'class-transformer';

export class PushJob {
    @Expose()
    endpoint_name: string;

    @Expose()
    path: string;

    @Expose()
    description: string;

    @Expose()
    mode: IngestMode;

    @Expose()
    table_name: string;

    @Expose()
    version: string
}
