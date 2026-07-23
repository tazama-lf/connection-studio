import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateScheduleJobDto {
  @IsOptional()
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  cron: string;

  @IsNumber()
  iterations: number;
}
