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
  ListInventoryBalancesQueryDto,
  ListStockMovementsQueryDto,
  PaginatedInventoryBalancesDto,
  PaginatedStockMovementsDto,
  StockAdjustmentDto,
  StockEntryDto,
  StockExitDto,
  StockMovementResponseDto,
  StockTransferDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOkResponse({ type: PaginatedInventoryBalancesDto })
  findBalances(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInventoryBalancesQueryDto,
  ) {
    return this.service.findBalances(user, query);
  }

  @Get('options')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  options(@CurrentUser() user: AuthenticatedUser) {
    return this.service.options(user);
  }

  @Get('products/:productId')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  findProductBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ) {
    return this.service.findProductBalance(user, productId);
  }

  @Get('movements')
  @RequirePermissions(PERMISSIONS.INVENTORY_MOVEMENTS_READ)
  @ApiOkResponse({ type: PaginatedStockMovementsDto })
  findMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStockMovementsQueryDto,
  ) {
    return this.service.findMovements(user, query);
  }

  @Post('movements/entry')
  @RequirePermissions(PERMISSIONS.INVENTORY_ENTRY)
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  @ApiConflictResponse({ description: 'Chave de idempotência reutilizada.' })
  entry(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StockEntryDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.entry(user, dto, requestId ?? randomUUID());
  }

  @Post('movements/exit')
  @RequirePermissions(PERMISSIONS.INVENTORY_EXIT)
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Saldo insuficiente.' })
  exit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StockExitDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.exit(user, dto, requestId ?? randomUUID());
  }

  @Post('movements/adjustment')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  adjustment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StockAdjustmentDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.adjustment(user, dto, requestId ?? randomUUID());
  }

  @Post('movements/transfer')
  @RequirePermissions(PERMISSIONS.INVENTORY_TRANSFER)
  @ApiCreatedResponse({ type: StockMovementResponseDto })
  transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StockTransferDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.transfer(user, dto, requestId ?? randomUUID());
  }

  @Get('movements/:id')
  @RequirePermissions(PERMISSIONS.INVENTORY_MOVEMENTS_READ)
  @ApiOkResponse({ type: StockMovementResponseDto })
  @ApiNotFoundResponse({ description: 'Movimentação não encontrada.' })
  findMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findMovement(user, id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiNotFoundResponse({ description: 'Saldo não encontrado.' })
  findBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findBalance(user, id);
  }
}
