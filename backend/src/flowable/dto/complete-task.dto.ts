import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class CompleteTaskDto {
  @IsNotEmpty()
  @IsString()
  taskId: string;

  @IsNotEmpty()
  @IsObject()
  variables: Record<string, any>;
}
