import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdatePublishingStatusDto {
  @IsEnum(['active', 'inactive'], {
    message: 'publishingStatus must be either "active" or "inactive"',
  })
  @IsNotEmpty()
  publishingStatus: 'active' | 'inactive';
}
