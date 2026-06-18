import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  SearchAroundDto,
  SearchInBboxDto,
  SearchTextDto,
} from './dto/search-sites.dto';
import {
  SitesService,
  type SiteDetail,
  type SiteSearchResult,
} from './sites.service';

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

  // GET /sites/search?q=brest&type=CHURCH
  @Get('search')
  searchByText(@Query() query: SearchTextDto): Promise<SiteSearchResult[]> {
    return this.sites.searchByText(query);
  }

  // GET /sites/:slug — détail d'une fiche (déclaré APRÈS les routes littérales).
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string): Promise<SiteDetail> {
    const site = await this.sites.getBySlug(slug);
    if (!site) {
      throw new NotFoundException('Lieu introuvable');
    }
    return site;
  }
}
