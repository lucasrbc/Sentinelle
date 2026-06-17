import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root(): { name: string; status: string } {
    return { name: 'sentinelle-api', status: 'ok' };
  }
}
