import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
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
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsInventoryQueryDto,
  AnalyticsPeriodQueryDto,
  AnalyticsPurchasesQueryDto,
  AnalyticsSalesQueryDto,
} from './dto/analytics.dto';
import { ListFinancialEntriesQueryDto } from '../finance/dto/finance.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.ANALYTICS_DASHBOARD_READ)
  @ApiOkResponse({ description: 'Indicadores reais dos domínios autorizados.' })
  dashboard(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsPeriodQueryDto) {
    return this.service.dashboard(user, query);
  }

  @Get('sales')
  @RequirePermissions(PERMISSIONS.SALES_ORDERS_READ)
  @ApiOkResponse({ description: 'Relatório gerencial paginado de pedidos de venda válidos.' })
  sales(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsSalesQueryDto) {
    return this.service.salesReport(user, query);
  }

  @Get('purchases')
  @RequirePermissions(PERMISSIONS.PURCHASE_ORDERS_READ)
  @ApiOkResponse({ description: 'Relatório gerencial paginado de compras.' })
  purchases(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsPurchasesQueryDto) {
    return this.service.purchasesReport(user, query);
  }

  @Get('inventory')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOkResponse({ description: 'Posição atual de estoque por produto e endereço.' })
  inventory(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsInventoryQueryDto) {
    return this.service.inventoryReport(user, query);
  }

  @Get('finance')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @ApiOkResponse({ description: 'Relatório paginado de títulos financeiros.' })
  finance(@CurrentUser() user: AuthenticatedUser, @Query() query: ListFinancialEntriesQueryDto) {
    return this.service.financeReport(user, query);
  }
}
