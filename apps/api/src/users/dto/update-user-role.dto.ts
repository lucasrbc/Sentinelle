import { IsEnum } from 'class-validator';
import { UserRole } from '@sentinelle/db';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
