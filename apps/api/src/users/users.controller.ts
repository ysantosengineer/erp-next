import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import { PaginatedUsersDto, UserResponseDto } from './dto/user-response.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Lista os usuários da empresa autenticada.' })
  @ApiOkResponse({ type: PaginatedUsersDto })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  @ApiOperation({ summary: 'Cria um usuário na empresa autenticada.' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiConflictResponse({ description: 'E-mail já utilizado.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.usersService.create(user, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.usersService.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'E-mail já utilizado.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.usersService.update(user, id, dto, requestId ?? randomUUID());
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE_STATUS)
  @ApiOkResponse({ type: UserResponseDto })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.usersService.updateStatus(user, id, dto.isActive, requestId ?? randomUUID());
  }

  @Put(':id/roles')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE_ROLES)
  @ApiOkResponse({ type: UserResponseDto })
  replaceRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReplaceUserRolesDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.usersService.replaceRoles(user, id, dto.roleIds, requestId ?? randomUUID());
  }
}
