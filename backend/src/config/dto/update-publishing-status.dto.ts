import { IsIn } from 'class-validator';

export class UpdatePublishingStatusDto {
  @IsIn(['active', 'inactive'])
  publishing_status!: 'active' | 'inactive';
}
