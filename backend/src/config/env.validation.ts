import { plainToClass } from 'class-transformer';
import {
  IsEnum,
  IsString,
  IsNumberString,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  DEVELOPMENT = 'dev',
  PRODUCTION = 'prod',
  TEST = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv;

  @IsNumberString()
  MAX_CPU: string;

  @IsString()
  FUNCTION_NAME: string;

  @IsString()
  TAZAMA_AUTH_URL: string;

  @IsString()
  AUTH_PUBLIC_KEY_PATH: string;

  @IsString()
  CERT_PATH_PUBLIC: string;

  @IsString()
  CONFIGURATION_DATABASE_URL: string;

  @IsString()
  CONFIGURATION_DATABASE: string;

  @IsString()
  CONFIGURATION_DATABASE_USER: string;

  @IsString()
  CONFIGURATION_DATABASE_PASSWORD: string;
}

export const validate = (config: Record<string, unknown>) => {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
};
