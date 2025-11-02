import { PartialType } from '@nestjs/swagger';
import { CreatePullJobDto } from './create-pull-job.dto';

export class UpdatePullJobDto extends PartialType(CreatePullJobDto) { }
