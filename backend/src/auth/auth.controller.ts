import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  ValidationPipe,
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: LoginDto,
  ): Promise<{ message: string; token: string; expiresIn?: any }> {
    try {
      const result = await this.authService.login(body.username, body.password);
      const response: any = {
        message: 'Login successful',
        token: result.token,
      };
      if (result.expiresIn) {
        response.expiresIn = result.expiresIn;
      }
      return response;
    } catch (error) {
      this.logger.warn(`Login attempt failed`, AuthController.name);
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
