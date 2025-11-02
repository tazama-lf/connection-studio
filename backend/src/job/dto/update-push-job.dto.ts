import { PartialType } from '@nestjs/swagger';
import { CreatePushJobDto } from './create-push-job.dto';

export class UpdatePushJobDto extends PartialType(CreatePushJobDto) { }
