import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  UserRole,
  type Project,
  type ProjectUpdate,
  type User,
} from '@sentinelle/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../storage/storage.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectUpdateDto } from './dto/create-project-update.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  @Post()
  @Roles(UserRole.PROJECT_OWNER)
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projects.create(user, dto);
  }

  // Routes littérales déclarées avant les routes paramétrées.
  @Get('mine')
  @Roles(UserRole.PROJECT_OWNER)
  listMine(@CurrentUser() user: User): Promise<Project[]> {
    return this.projects.listMine(user);
  }

  @Get('moderation')
  @Roles(UserRole.ADMIN)
  moderationQueue(): Promise<Project[]> {
    return this.projects.listForModeration();
  }

  @Get(':id')
  @Roles(UserRole.PROJECT_OWNER, UserRole.ADMIN)
  getOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projects.getOne(user, id);
  }

  @Patch(':id')
  @Roles(UserRole.PROJECT_OWNER, UserRole.ADMIN)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projects.update(user, id, dto);
  }

  @Post(':id/submit')
  @Roles(UserRole.PROJECT_OWNER)
  submit(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projects.submit(user, id);
  }

  @Post(':id/quote')
  @Roles(UserRole.PROJECT_OWNER, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadQuote(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Project> {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu (champ « file »).');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Le devis doit être un fichier PDF.');
    }
    const key = `quotes/${id}-${Date.now()}.pdf`;
    const stored = await this.storage.save(key, file.buffer, file.mimetype);
    return this.projects.setQuoteUrl(user, id, stored.url);
  }

  @Post(':id/updates')
  @Roles(UserRole.PROJECT_OWNER)
  addUpdate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateProjectUpdateDto,
  ): Promise<ProjectUpdate> {
    return this.projects.addUpdate(user, id, dto);
  }

  // Actualités d'un projet PUBLISHED : accessibles publiquement (fiche du lieu).
  @Public()
  @Get(':id/updates')
  listUpdates(@Param('id') id: string): Promise<ProjectUpdate[]> {
    return this.projects.listUpdates(id);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN)
  publish(@Param('id') id: string): Promise<Project> {
    return this.projects.publish(id);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string): Promise<Project> {
    return this.projects.reject(id);
  }
}
