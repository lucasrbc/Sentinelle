import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { UserRole, type User } from '@sentinelle/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { toUserView, UsersService, type UserView } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Profil de l'utilisateur connecté. */
  @Get('me')
  me(@CurrentUser() user: User): UserView {
    return toUserView(user);
  }

  /** Mise à jour de son propre profil (nom d'affichage). */
  @Patch('me')
  updateMe(
    @CurrentUser() user: User,
    @Body() dto: UpdateMeDto,
  ): Promise<UserView> {
    return this.users.updateName(user.id, dto.name);
  }

  /** Droit à l'effacement (RGPD) : suppression de son propre compte. */
  @Delete('me')
  deleteMe(@CurrentUser() user: User): Promise<{ deleted: boolean }> {
    return this.users.deleteSelf(user.id);
  }

  /** Liste des comptes (administration). */
  @Get('users')
  @Roles(UserRole.ADMIN)
  list(): Promise<UserView[]> {
    return this.users.list();
  }

  /** Changement de rôle d'un compte (administration). */
  @Patch('users/:id/role')
  @Roles(UserRole.ADMIN)
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserView> {
    return this.users.updateRole(id, dto.role);
  }
}
