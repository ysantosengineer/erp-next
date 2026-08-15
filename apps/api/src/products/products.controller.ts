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
  CreateProductDto,
  ListProductsQueryDto,
  PaginatedProductsDto,
  ProductResponseDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sessão inválida.' })
@ApiForbiddenResponse({ description: 'Permissão insuficiente.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Lista produtos da empresa autenticada.' })
  @ApiOkResponse({ type: PaginatedProductsDto })
  @ApiBadRequestResponse({ description: 'Filtros ou ordenação inválidos.' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListProductsQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  @ApiOperation({ summary: 'Cria um produto na empresa autenticada.' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'Dados do produto inválidos.' })
  @ApiNotFoundResponse({ description: 'Categoria, unidade ou fornecedor não encontrado.' })
  @ApiConflictResponse({ description: 'SKU ou código de barras duplicado.' })
  @ApiUnprocessableEntityResponse({ description: 'Relacionamento selecionado está inativo.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(user, dto, requestId ?? randomUUID());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_UPDATE)
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'Dados do produto inválidos.' })
  @ApiNotFoundResponse({ description: 'Produto ou relacionamento não encontrado.' })
  @ApiConflictResponse({ description: 'SKU ou código de barras duplicado.' })
  @ApiUnprocessableEntityResponse({ description: 'Relacionamento selecionado está inativo.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProductDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(user, id, dto, requestId ?? randomUUID());
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.PRODUCTS_MANAGE_STATUS)
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Produto não encontrado.' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProductStatusDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.updateStatus(user, id, dto.isActive, requestId ?? randomUUID());
  }
}
