import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

@Public()
@Controller()
export class AppController {
  @Get()
  root(): { name: string; status: string } {
    return { name: 'sentinelle-api', status: 'ok' };
  }
}
