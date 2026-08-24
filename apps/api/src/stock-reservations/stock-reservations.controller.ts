import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS } from '../authorization/permissions.constants';
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import {
  ListStockReservationsQueryDto,
  PaginatedStockReservationsDto,
  StockReservationResponseDto,
} from './dto/stock-reservation.dto';
import { StockReservationsService } from './stock-reservations.service';

@ApiTags('Stock reservations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory/reservations')
export class StockReservationsController {
  constructor(private readonly service: StockReservationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_RESERVATIONS_READ)
  @ApiOkResponse({ type: PaginatedStockReservationsDto })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListStockReservationsQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_RESERVATIONS_READ)
  @ApiOkResponse({ type: StockReservationResponseDto })
  @ApiNotFoundResponse({ description: 'Reserva não encontrada.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }
}
