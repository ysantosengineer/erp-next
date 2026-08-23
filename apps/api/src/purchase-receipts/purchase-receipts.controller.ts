import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
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
  CreatePurchaseReceiptDto,
  ListPurchaseReceiptsQueryDto,
  PaginatedPurchaseReceiptsDto,
  PurchaseOrderReceivableResponseDto,
  PurchaseReceiptResponseDto,
} from './dto/purchase-receipt.dto';
import { PurchaseReceiptsService } from './purchase-receipts.service';

@ApiTags('Purchase receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-receipts')
export class PurchaseReceiptsController {
  constructor(private readonly service: PurchaseReceiptsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASE_RECEIPTS_READ)
  @ApiOperation({ summary: 'Lista recebimentos imutáveis com filtros e paginação.' })
  @ApiOkResponse({ type: PaginatedPurchaseReceiptsDto })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPurchaseReceiptsQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.PURCHASE_RECEIPTS_READ)
  @ApiOperation({ summary: 'Lista fornecedores e depósitos para os filtros.' })
  options(@CurrentUser() user: AuthenticatedUser) {
    return this.service.options(user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASE_RECEIPTS_CREATE)
  @ApiOperation({
    summary: 'Confirma um recebimento e atualiza estoque e pedido atomicamente.',
    description:
      'Aceita recebimentos parciais e retries idempotentes. A confirmação é imutável e gera entradas reais no estoque.',
  })
  @ApiCreatedResponse({ type: PurchaseReceiptResponseDto })
  @ApiNotFoundResponse({ description: 'Pedido, item ou localização não encontrado no tenant.' })
  @ApiConflictResponse({ description: 'Estado, concorrência ou chave de idempotência inválida.' })
  @ApiUnprocessableEntityResponse({
    description: 'Quantidade acima do pendente, localização inválida/inativa ou inventário ativo.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseReceiptDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASE_RECEIPTS_READ)
  @ApiOkResponse({ type: PurchaseReceiptResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }
}

@ApiTags('Purchase orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrderReceivableController {
  constructor(private readonly service: PurchaseReceiptsService) {}

  @Get(':id/receivable')
  @RequirePermissions(PERMISSIONS.PURCHASE_RECEIPTS_CREATE)
  @ApiOperation({
    summary: 'Retorna quantidades pendentes e localizações permitidas para recebimento.',
  })
  @ApiOkResponse({ type: PurchaseOrderReceivableResponseDto })
  @ApiConflictResponse({ description: 'Pedido não está em estado recebível.' })
  receivable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.getReceivable(user, id);
  }
}
