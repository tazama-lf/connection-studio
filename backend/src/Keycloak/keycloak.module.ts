import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { KeycloakService } from './keycloak.service';
import { EmailCacheService } from './email-cache.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [KeycloakService, EmailCacheService],
  exports: [KeycloakService, EmailCacheService],
})
export class KeycloakModule {}
