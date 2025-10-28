import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';

export class CreateScheduleJobDto {
  @IsString()
  name: string;

  @IsString()
  cron: string;

  @IsNumber()
  iterations: number;

  @IsDate()
  @Type(() => Date)
  start_date: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date?: Date;
}
