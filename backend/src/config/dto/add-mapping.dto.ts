import { IsNotEmpty, IsString } from 'class-validator';

export class AddMappingDto {
  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;
}
