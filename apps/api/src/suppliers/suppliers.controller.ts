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
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PERMISSIONS } from '../authorization/permissions.constants';
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import {
  CreateSupplierDto,
  ListSuppliersQueryDto,
  PaginatedSuppliersDto,
  SupplierResponseDto,
  UpdateSupplierDto,
  UpdateSupplierStatusDto,
} from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';
@ApiTags('Suppliers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}
  @Get()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_READ)
  @ApiOperation({ summary: 'Lista fornecedores da empresa autenticada.' })
  @ApiOkResponse({ type: PaginatedSuppliersDto })
  @ApiBadRequestResponse({ description: 'Filtros inválidos.' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListSuppliersQueryDto) {
    return this.service.findAll(user, query);
  }
  @Post()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_CREATE)
  @ApiCreatedResponse({ type: SupplierResponseDto })
  @ApiBadRequestResponse({ description: 'CPF/CNPJ inválido.' })
  @ApiConflictResponse({ description: 'Documento duplicado.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }
  @Get(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_READ)
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiNotFoundResponse({ description: 'Fornecedor não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_UPDATE)
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiConflictResponse({ description: 'Documento duplicado.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSupplierDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(user, id, dto, requestId ?? randomUUID());
  }
  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_MANAGE_STATUS)
  @ApiOkResponse({ type: SupplierResponseDto })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSupplierStatusDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.updateStatus(user, id, dto.isActive, requestId ?? randomUUID());
  }
}
