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
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS } from '../authorization/permissions.constants';
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import {
  CancelPurchaseOrderDto,
  CreatePurchaseOrderDto,
  ListPurchaseOrdersQueryDto,
  PaginatedPurchaseOrdersDto,
  PurchaseOrderOptionsQueryDto,
  PurchaseOrderResponseDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Purchase orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_READ)
  @ApiOkResponse({ type: PaginatedPurchaseOrdersDto })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPurchaseOrdersQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_READ)
  @ApiOperation({ summary: 'Lista fornecedores, depósitos e produtos ativos para o pedido.' })
  options(@CurrentUser() user: AuthenticatedUser, @Query() query: PurchaseOrderOptionsQueryDto) {
    return this.service.options(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_CREATE)
  @ApiCreatedResponse({ type: PurchaseOrderResponseDto })
  @ApiNotFoundResponse({ description: 'Fornecedor, depósito ou produto não encontrado.' })
  @ApiUnprocessableEntityResponse({ description: 'Relacionamento ou valor inválido.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseOrderDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_READ)
  @ApiOkResponse({ type: PurchaseOrderResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_UPDATE)
  @ApiOkResponse({ type: PurchaseOrderResponseDto })
  @ApiConflictResponse({ description: 'Pedido não editável ou alterado concorrentemente.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(user, id, dto, requestId ?? randomUUID());
  }

  @Post(':id/submit')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_SUBMIT)
  @ApiOperation({ summary: 'Envia um rascunho para aprovação.' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.submit(user, id, requestId ?? randomUUID());
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_APPROVE)
  @ApiOperation({ summary: 'Aprova o pedido sem alterar estoque.' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.approve(user, id, requestId ?? randomUUID());
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_CANCEL)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelPurchaseOrderDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.cancel(user, id, dto.reason, requestId ?? randomUUID());
  }
}
