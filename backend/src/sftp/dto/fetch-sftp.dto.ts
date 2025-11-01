import { Expose } from 'class-transformer';

export class FetchSftpDto {
    @Expose()
    name: string

    @Expose()
    size: string

    @Expose()
    modifyTime: number;
}
