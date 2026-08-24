import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS } from '../authorization/permissions.constants';
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { ShipSalesOrderDto } from '../stock-reservations/dto/stock-reservation.dto';
import { StockReservationsService } from '../stock-reservations/stock-reservations.service';
import {
  CancelSalesOrderDto,
  CreateSalesOrderDto,
  ListSalesOrdersQueryDto,
  PaginatedSalesOrdersDto,
  SalesOrderOptionsQueryDto,
  SalesOrderResponseDto,
  UpdateSalesOrderDto,
} from './dto/sales-order.dto';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('Sales orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(
    private readonly service: SalesOrdersService,
    private readonly stockReservations: StockReservationsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SALES_ORDERS_READ)
  @ApiOkResponse({ type: PaginatedSalesOrdersDto })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListSalesOrdersQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.SALES_ORDERS_READ)
  @ApiOperation({
    summary: 'Lista clientes, depósitos e produtos ativos para pedidos de venda.',
    description: 'Preços são sugestões. Nenhum saldo é reservado ou alterado.',
  })
  options(@CurrentUser() user: AuthenticatedUser, @Query() query: SalesOrderOptionsQueryDto) {
    return this.service.options(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SALES_ORDERS_CREATE)
  @ApiCreatedResponse({ type: SalesOrderResponseDto })
  @ApiNotFoundResponse({ description: 'Cliente, depósito ou produto não encontrado.' })
  @ApiUnprocessableEntityResponse({ description: 'Relacionamento, quantidade ou valor inválido.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalesOrderDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SALES_ORDERS_READ)
  @ApiOkResponse({ type: SalesOrderResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SALES_ORDERS_UPDATE)
  @ApiOkResponse({ type: SalesOrderResponseDto })
  @ApiConflictResponse({ description: 'Pedido não editável ou alterado concorrentemente.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSalesOrderDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(user, id, dto, requestId ?? randomUUID());
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SALES_ORDERS_CONFIRM)
  @ApiOperation({
    summary: 'Confirma o pedido de venda.',
    description: 'A confirmação é comercial e não reserva, baixa ou movimenta estoque.',
  })
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.confirm(user, id, requestId ?? randomUUID());
  }

  @Post(':id/reserve')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.INVENTORY_RESERVE)
  @ApiOperation({
    summary: 'Reserva integralmente o estoque de um pedido confirmado.',
    description:
      'A alocação automática por endereço é atômica, não reduz o saldo físico e não cria movimentação.',
  })
  reserve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.stockReservations.reserve(user, id, requestId ?? randomUUID());
  }

  @Post(':id/release-reservation')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.INVENTORY_RELEASE)
  @ApiOperation({ summary: 'Libera as reservas ativas sem alterar o saldo físico.' })
  releaseReservation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.stockReservations.release(user, id, requestId ?? randomUUID());
  }

  @Post(':id/ship')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.INVENTORY_SHIP)
  @ApiOperation({
    summary: 'Realiza a baixa integral do pedido reservado.',
    description:
      'Reduz o saldo físico, consome reservas e cria movimentos EXIT referenciados ao pedido na mesma transação.',
  })
  ship(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ShipSalesOrderDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.stockReservations.ship(user, id, dto, requestId ?? randomUUID());
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SALES_ORDERS_CANCEL)
  @ApiOperation({
    summary: 'Cancela um pedido ainda não baixado.',
    description: 'Reservas ativas são liberadas atomicamente; o saldo físico não é alterado.',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelSalesOrderDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.cancel(user, id, dto.reason, requestId ?? randomUUID());
  }
}
