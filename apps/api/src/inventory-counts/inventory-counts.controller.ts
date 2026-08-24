import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
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
  AddInventoryCountItemDto,
  CreateInventoryCountDto,
  InventoryCountDetailQueryDto,
  InventoryCountDetailResponseDto,
  InventoryCountOptionsQueryDto,
  InventoryCountResponseDto,
  ListInventoryCountsQueryDto,
  PaginatedInventoryCountsDto,
  SubmitInventoryCountQuantityDto,
} from './dto/inventory-counts.dto';
import { InventoryCountsService } from './inventory-counts.service';

@ApiTags('Physical inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/counts')
export class InventoryCountsController {
  constructor(private readonly service: InventoryCountsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_READ)
  @ApiOkResponse({ type: PaginatedInventoryCountsDto })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInventoryCountsQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_CREATE)
  @ApiCreatedResponse({ type: InventoryCountResponseDto })
  @ApiConflictResponse({ description: 'Já existe inventário ativo no depósito.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInventoryCountDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_COUNT)
  @ApiOperation({ summary: 'Lista produtos e endereços ativos para inclusão manual' })
  options(@CurrentUser() user: AuthenticatedUser, @Query() query: InventoryCountOptionsQueryDto) {
    return this.service.options(user, query.warehouseId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_READ)
  @ApiOkResponse({ type: InventoryCountDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Inventário não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: InventoryCountDetailQueryDto,
  ) {
    return this.service.findOne(user, id, query);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_CREATE)
  @ApiOperation({ summary: 'Captura o snapshot e inicia a primeira contagem' })
  @ApiOkResponse({ type: InventoryCountDetailResponseDto })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.start(user, id, requestId ?? randomUUID());
  }

  @Post(':id/items')
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_COUNT)
  @ApiOperation({ summary: 'Inclui item físico sem saldo no snapshot' })
  @ApiCreatedResponse({ type: InventoryCountDetailResponseDto })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AddInventoryCountItemDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.addItem(user, id, dto, requestId ?? randomUUID());
  }

  @Put(':id/items/:itemId/count')
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_COUNT)
  @ApiOkResponse({ type: InventoryCountDetailResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Quantidade ou estado inválido.' })
  countItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Body() dto: SubmitInventoryCountQuantityDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.countItem(user, id, itemId, dto, requestId ?? randomUUID());
  }

  @Post(':id/recount')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_RECOUNT)
  @ApiOperation({ summary: 'Conclui a primeira contagem ou reabre as divergências' })
  @ApiOkResponse({ type: InventoryCountDetailResponseDto })
  requestRecount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.requestRecount(user, id, requestId ?? randomUUID());
  }

  @Put(':id/items/:itemId/recount')
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_RECOUNT)
  @ApiOkResponse({ type: InventoryCountDetailResponseDto })
  recountItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId: string,
    @Body() dto: SubmitInventoryCountQuantityDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.recountItem(user, id, itemId, dto, requestId ?? randomUUID());
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_APPROVE)
  @ApiOperation({ summary: 'Aprova atomicamente e gera movimentações de ajuste' })
  @ApiOkResponse({ type: InventoryCountDetailResponseDto })
  @ApiConflictResponse({ description: 'Inventário aprovado, cancelado ou concorrente.' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.approve(user, id, requestId ?? randomUUID());
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.INVENTORY_COUNTS_CANCEL)
  @ApiOkResponse({ type: InventoryCountDetailResponseDto })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.cancel(user, id, requestId ?? randomUUID());
  }
}
