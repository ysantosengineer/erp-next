import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS } from '../authorization/permissions.constants';
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import {
  CreateWarehouseDto,
  ListWarehousesQueryDto,
  PaginatedWarehousesDto,
  UpdateWarehouseDto,
  UpdateWarehouseStatusDto,
  WarehouseResponseDto,
} from './dto/warehouse.dto';
import { WarehousesService } from './warehouses.service';

@ApiTags('Warehouses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.WAREHOUSES_READ)
  @ApiOkResponse({ type: PaginatedWarehousesDto })
  @ApiBadRequestResponse({ description: 'Filtros inválidos.' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListWarehousesQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.WAREHOUSES_CREATE)
  @ApiCreatedResponse({ type: WarehouseResponseDto })
  @ApiConflictResponse({ description: 'Código duplicado na empresa.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWarehouseDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.WAREHOUSES_READ)
  @ApiOkResponse({ type: WarehouseResponseDto })
  @ApiNotFoundResponse({ description: 'Depósito não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WAREHOUSES_UPDATE)
  @ApiOkResponse({ type: WarehouseResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiConflictResponse({ description: 'Código duplicado na empresa.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWarehouseDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(user, id, dto, requestId ?? randomUUID());
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.WAREHOUSES_MANAGE_STATUS)
  @ApiOkResponse({ type: WarehouseResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'O depósito possui endereços ativos.' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWarehouseStatusDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.updateStatus(user, id, dto.isActive, requestId ?? randomUUID());
  }
}
