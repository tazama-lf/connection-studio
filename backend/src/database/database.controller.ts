import { Body, Controller, Get, Post } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('database')
export class DatabaseController {
  constructor(private readonly db: DatabaseService) {}

  @Post('execute')
  async executeQuery(@Body('query') query: string) {
    if (!query) {
      return { success: false, message: 'No query provided' };
    }
    return await this.db.query(query);
  }

  @Get('config')
  async getConfig() {
    return await this.db.getConfigFile();
  }
}
