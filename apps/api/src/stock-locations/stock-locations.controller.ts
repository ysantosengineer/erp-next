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
  CreateStockLocationDto,
  ListStockLocationsQueryDto,
  PaginatedStockLocationsDto,
  StockLocationResponseDto,
  UpdateStockLocationDto,
  UpdateStockLocationStatusDto,
} from './dto/stock-location.dto';
import { StockLocationsService } from './stock-locations.service';

@ApiTags('Stock Locations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses/:warehouseId/locations')
export class StockLocationsController {
  constructor(private readonly service: StockLocationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STOCK_LOCATIONS_READ)
  @ApiOkResponse({ type: PaginatedStockLocationsDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('warehouseId', new ParseUUIDPipe({ version: '4' })) warehouseId: string,
    @Query() query: ListStockLocationsQueryDto,
  ) {
    return this.service.findAll(user, warehouseId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.STOCK_LOCATIONS_CREATE)
  @ApiCreatedResponse({ type: StockLocationResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Depósito não encontrado.' })
  @ApiConflictResponse({ description: 'Código duplicado no depósito.' })
  @ApiUnprocessableEntityResponse({ description: 'Depósito inativo.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('warehouseId', new ParseUUIDPipe({ version: '4' })) warehouseId: string,
    @Body() dto: CreateStockLocationDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, warehouseId, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STOCK_LOCATIONS_READ)
  @ApiOkResponse({ type: StockLocationResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('warehouseId', new ParseUUIDPipe({ version: '4' })) warehouseId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, warehouseId, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STOCK_LOCATIONS_UPDATE)
  @ApiOkResponse({ type: StockLocationResponseDto })
  @ApiConflictResponse({ description: 'Código duplicado no depósito.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('warehouseId', new ParseUUIDPipe({ version: '4' })) warehouseId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateStockLocationDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(user, warehouseId, id, dto, requestId ?? randomUUID());
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.STOCK_LOCATIONS_MANAGE_STATUS)
  @ApiOkResponse({ type: StockLocationResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Depósito inativo ao tentar reativar.' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('warehouseId', new ParseUUIDPipe({ version: '4' })) warehouseId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateStockLocationStatusDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.updateStatus(
      user,
      warehouseId,
      id,
      dto.isActive,
      requestId ?? randomUUID(),
    );
  }
}
