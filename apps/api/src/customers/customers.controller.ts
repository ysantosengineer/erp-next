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
  CreateCustomerDto,
  ListCustomersQueryDto,
  PaginatedCustomersDto,
  CustomerResponseDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from './dto/customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CUSTOMERS_READ)
  @ApiOperation({ summary: 'Lista clientes da empresa autenticada.' })
  @ApiOkResponse({ type: PaginatedCustomersDto })
  @ApiBadRequestResponse({ description: 'Filtros inválidos.' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListCustomersQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CUSTOMERS_CREATE)
  @ApiCreatedResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ description: 'Dados ou CPF/CNPJ inválidos.' })
  @ApiConflictResponse({ description: 'Documento duplicado.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_READ)
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_UPDATE)
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiConflictResponse({ description: 'Documento duplicado.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCustomerDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(user, id, dto, requestId ?? randomUUID());
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.CUSTOMERS_MANAGE_STATUS)
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado.' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCustomerStatusDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.updateStatus(user, id, dto.isActive, requestId ?? randomUUID());
  }
}
