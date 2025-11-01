import { Expose } from 'class-transformer';

export class FetchSftpDto {
  @Expose()
  name: string;
}
