import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating publishing status
 * Used by: PATCH /api/v1/config/:id/publishing-status
 */
export class UpdatePublishingStatusDto {
  @IsEnum(['active', 'inactive'], {
    message: 'publishingStatus must be either "active" or "inactive"',
  })
  @IsNotEmpty()
  publishingStatus: 'active' | 'inactive';
}
