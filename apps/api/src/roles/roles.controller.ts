import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS } from '../authorization/permissions.constants';
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'Lista os papéis da empresa autenticada.' })
  @ApiOkResponse({ type: [RoleResponseDto] })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.findAll(user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES_CREATE)
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiConflictResponse({ description: 'Nome já utilizado na empresa.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.rolesService.create(user, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Papel não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.rolesService.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ROLES_UPDATE)
  @ApiOkResponse({ type: RoleResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRoleDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.rolesService.update(user, id, dto, requestId ?? randomUUID());
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  @ApiNoContentResponse({ description: 'Papel removido.' })
  @ApiConflictResponse({ description: 'Papel em uso.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<void> {
    await this.rolesService.remove(user, id, requestId ?? randomUUID());
  }

  @Put(':id/permissions')
  @RequirePermissions(PERMISSIONS.ROLES_MANAGE_PERMISSIONS)
  @ApiOkResponse({ type: RoleResponseDto })
  replacePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReplaceRolePermissionsDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.rolesService.replacePermissions(
      user,
      id,
      dto.permissionIds,
      requestId ?? randomUUID(),
    );
  }
}
