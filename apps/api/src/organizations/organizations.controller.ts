import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole, type Organization, type User } from '@sentinelle/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  /** Crée son organisation et devient porteur de projet. */
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.organizations.createForUser(user, dto);
  }

  /** Administration : lister les organisations (`?unverified=true` pour filtrer). */
  @Get()
  @Roles(UserRole.ADMIN)
  list(@Query('unverified') unverified?: string): Promise<Organization[]> {
    return this.organizations.list(unverified === 'true');
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<Organization> {
    return this.organizations.getById(id);
  }

  /** Administration : valider une organisation. */
  @Patch(':id/verify')
  @Roles(UserRole.ADMIN)
  verify(@Param('id') id: string): Promise<Organization> {
    return this.organizations.setVerified(id, true);
  }
}
