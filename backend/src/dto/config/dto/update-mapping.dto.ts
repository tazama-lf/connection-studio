import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransformationDto } from './create-mapping.dto';
export class UpdateMappingDto {
  @IsString()
  @IsNotEmpty()
  mappingId: string;

  @IsString()
  @IsOptional()
  sourcePath?: string;

  @IsString()
  @IsOptional()
  destinationPath?: string;

  @IsString()
  @IsOptional()
  dataType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransformationDto)
  @IsOptional()
  transformations?: TransformationDto[];

  @IsString()
  @IsOptional()
  defaultValue?: string;
}
