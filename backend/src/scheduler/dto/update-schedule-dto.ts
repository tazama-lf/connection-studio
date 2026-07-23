import { PartialType } from '@nestjs/swagger';
import { CreateScheduleJobDto } from './create-schedule.dto';

export class UpdateScheduleJobDto extends PartialType(CreateScheduleJobDto) {}
