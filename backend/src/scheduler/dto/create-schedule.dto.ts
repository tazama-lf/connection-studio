import { IsDate, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ScheduleStatus } from '../../utils/interfaces';
import { Type } from 'class-transformer';

export class CreateScheduleJobDto {
  @IsString()
  name: string;

  @IsString()
  cron: string;

  @IsNumber()
  iterations: number;

  @IsEnum(ScheduleStatus)
  schedule_status: ScheduleStatus = ScheduleStatus.ACTIVE;

  @IsDate()
  @Type(() => Date)
  start_date: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date?: Date;
}
