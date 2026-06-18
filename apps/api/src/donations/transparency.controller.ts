import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { DonationsService, type TransparencyView } from './donations.service';

/** Transparence publique par projet : destination des fonds + avancement. */
@Public()
@Controller('transparency')
export class TransparencyController {
  constructor(private readonly donations: DonationsService) {}

  @Get(':projectId')
  get(@Param('projectId') projectId: string): Promise<TransparencyView> {
    return this.donations.transparency(projectId);
  }
}
