import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SearchAroundDto, SearchInBboxDto } from './dto/search-sites.dto';
import { SitesService, SiteSearchResult } from './sites.service';

// La carte et la recherche de lieux sont publiques (découverte sans compte).
@Public()
@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  // GET /sites/around?lat=..&lng=..&radius=..&type=CHURCH,CHAPEL
  @Get('around')
  searchAround(@Query() query: SearchAroundDto): Promise<SiteSearchResult[]> {
    return this.sites.searchAround(query);
  }

  // GET /sites/bbox?minLng=..&minLat=..&maxLng=..&maxLat=..
  @Get('bbox')
  searchInBbox(@Query() query: SearchInBboxDto): Promise<SiteSearchResult[]> {
    return this.sites.searchInBbox(query);
  }
}
