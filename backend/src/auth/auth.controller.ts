import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { username: string; password: string }): Promise<{ message: string; token: string; expiresIn?: any }> {
    try {
      const result = await this.authService.login(body.username, body.password);

      this.logger.log('Login successful', AuthController.name);

      const response: any = {
        message: 'Login successful',
        token: result.token,
      };
      if (result.expiresIn) {
        response.expiresIn = result.expiresIn;
      }
      return response;
    } catch (error) {
      this.logger.warn(`Login failed: ${error.message}`, AuthController.name);
      throw new UnauthorizedException('Invalid credentials');
      
    }
  }
}
