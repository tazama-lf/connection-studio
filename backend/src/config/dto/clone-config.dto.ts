import { IsArray, IsObject, IsOptional } from 'class-validator';
import { CreateConfigDto } from './create-config.dto';

// Cloning carries the source config's mappings; plain creation does not.
export class CloneConfigDto extends CreateConfigDto {
  @IsArray()
  @IsObject({ each: true })
  @IsOptional()
  mapping?: Array<Record<string, unknown>>;
}
