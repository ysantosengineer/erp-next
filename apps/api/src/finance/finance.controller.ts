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
  CancelFinancialEntryDto,
  CashFlowQueryDto,
  CreateFinancialEntryDto,
  CreateFinancialSettlementDto,
  FinanceSummaryQueryDto,
  FinancialEntryResponseDto,
  ListFinancialEntriesQueryDto,
  PaginatedFinancialEntriesDto,
  UpdateFinancialEntryDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get('options')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @ApiOkResponse({ description: 'Fornecedores e clientes ativos do tenant.' })
  options(@CurrentUser() user: AuthenticatedUser) {
    return this.service.options(user);
  }

  @Get('entries')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @ApiOkResponse({ type: PaginatedFinancialEntriesDto })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListFinancialEntriesQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post('entries')
  @RequirePermissions(PERMISSIONS.FINANCE_CREATE)
  @ApiCreatedResponse({ type: FinancialEntryResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Regra financeira inválida.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFinancialEntryDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }

  @Get('entries/:id')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @ApiOkResponse({ type: FinancialEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Título não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Patch('entries/:id')
  @RequirePermissions(PERMISSIONS.FINANCE_UPDATE)
  @ApiOkResponse({ type: FinancialEntryResponseDto })
  @ApiConflictResponse({ description: 'Título não pode mais ser editado.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateFinancialEntryDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(user, id, dto, requestId ?? randomUUID());
  }

  @Post('entries/:id/settlements')
  @RequirePermissions(PERMISSIONS.FINANCE_SETTLE)
  @ApiCreatedResponse({ description: 'Liquidação registrada de forma atômica.' })
  @ApiConflictResponse({ description: 'Conflito de idempotência ou concorrência.' })
  @ApiUnprocessableEntityResponse({ description: 'Valor excede o saldo ou título inelegível.' })
  settle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateFinancialSettlementDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.settle(user, id, dto, requestId ?? randomUUID());
  }

  @Post('entries/:id/cancel')
  @RequirePermissions(PERMISSIONS.FINANCE_CANCEL)
  @ApiOkResponse({ type: FinancialEntryResponseDto })
  @ApiConflictResponse({ description: 'Título com baixa não pode ser cancelado.' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelFinancialEntryDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.cancel(user, id, dto, requestId ?? randomUUID());
  }

  @Get('cash-flow')
  @RequirePermissions(PERMISSIONS.FINANCE_CASH_FLOW_READ)
  @ApiOkResponse({ description: 'Fluxo previsto, realizado ou combinado.' })
  cashFlow(@CurrentUser() user: AuthenticatedUser, @Query() query: CashFlowQueryDto) {
    return this.service.cashFlow(user, query);
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  @ApiOkResponse({ description: 'Resumo financeiro simples.' })
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: FinanceSummaryQueryDto) {
    return this.service.summary(user, query);
  }
}
