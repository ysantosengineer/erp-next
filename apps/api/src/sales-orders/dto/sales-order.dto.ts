import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SalesOrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const MONEY = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const QUANTITY = /^(?=.*[1-9])(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SalesOrderItemInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({ example: '2.5000', description: 'Decimal positivo com até quatro casas.' })
  @IsString()
  @Matches(QUANTITY, { message: 'Quantidade inválida.' })
  quantity!: string;

  @ApiProperty({ example: '49.90', description: 'Preço negociado, não negativo.' })
  @IsString()
  @Matches(MONEY, { message: 'Preço unitário inválido.' })
  unitPrice!: string;

  @ApiPropertyOptional({ default: '0.00', description: 'Desconto monetário desta linha.' })
  @IsOptional()
  @IsString()
  @Matches(MONEY, { message: 'Desconto do item inválido.' })
  discountAmount = '0';
}

export class CreateSalesOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  customerId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  warehouseId!: string;

  @ApiPropertyOptional({ example: '2026-08-23', description: 'Data civil YYYY-MM-DD.' })
  @IsOptional()
  @IsString()
  @Matches(DATE)
  @IsDateString({ strict: true })
  orderDate?: string;

  @ApiPropertyOptional({ example: '2026-08-30', description: 'Data civil YYYY-MM-DD.' })
  @IsOptional()
  @IsString()
  @Matches(DATE)
  @IsDateString({ strict: true })
  expectedDeliveryDate?: string | null;

  @ApiPropertyOptional({ maxLength: 4000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @ApiPropertyOptional({
    default: '0.00',
    description: 'Desconto geral após os descontos dos itens.',
  })
  @IsOptional()
  @IsString()
  @Matches(MONEY)
  discountAmount = '0';

  @ApiPropertyOptional({ default: '0.00' })
  @IsOptional()
  @IsString()
  @Matches(MONEY)
  freightAmount = '0';

  @ApiPropertyOptional({ default: '0.00' })
  @IsOptional()
  @IsString()
  @Matches(MONEY)
  otherAmount = '0';

  @ApiProperty({ type: [SalesOrderItemInputDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido deve possuir ao menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemInputDto)
  items!: SalesOrderItemInputDto[];
}

export class UpdateSalesOrderDto extends PartialType(CreateSalesOrderDto) {}

export class CancelSalesOrderDto {
  @ApiProperty({ minLength: 3, maxLength: 500 })
  @Transform(trim)
  @IsString()
  @Matches(/.*\S.*/, { message: 'Informe o motivo do cancelamento.' })
  @MaxLength(500)
  reason!: string;
}

export enum SalesOrderSortField {
  NUMBER = 'number',
  ORDER_DATE = 'orderDate',
  CREATED_AT = 'createdAt',
  EXPECTED_DELIVERY_DATE = 'expectedDeliveryDate',
  TOTAL_AMOUNT = 'totalAmount',
  STATUS = 'status',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListSalesOrdersQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(SalesOrderStatus) status?: SalesOrderStatus;
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsUUID('4') warehouseId?: string;
  @IsOptional() @IsString() @Matches(DATE) startDate?: string;
  @IsOptional() @IsString() @Matches(DATE) endDate?: string;
  @IsOptional() @IsString() @Matches(DATE) expectedDeliveryFrom?: string;
  @IsOptional() @IsString() @Matches(DATE) expectedDeliveryTo?: string;
  @IsOptional() @IsEnum(SalesOrderSortField) sortBy = SalesOrderSortField.CREATED_AT;
  @IsOptional() @IsEnum(SortOrder) sortOrder = SortOrder.DESC;
}

export class SalesOrderOptionsQueryDto {
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) productSearch?: string;
}

export class SalesOrderItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() productSku!: string;
  @ApiProperty() unitSymbol!: string;
  @ApiProperty() quantity!: string;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() grossAmount!: string;
  @ApiProperty() discountAmount!: string;
  @ApiProperty() subtotal!: string;
  @ApiProperty() reservedQuantity!: string;
}

class SalesOrderRelationDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class SalesOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'SO-000001' }) number!: string;
  @ApiProperty({ enum: SalesOrderStatus }) status!: SalesOrderStatus;
  @ApiProperty() customer!: SalesOrderRelationDto & { document: string; creditLimit: string };
  @ApiProperty() warehouse!: SalesOrderRelationDto & { code: string };
  @ApiProperty() orderDate!: string;
  @ApiProperty({ nullable: true }) expectedDeliveryDate!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() subtotal!: string;
  @ApiProperty() discountAmount!: string;
  @ApiProperty() freightAmount!: string;
  @ApiProperty() otherAmount!: string;
  @ApiProperty() totalAmount!: string;
  @ApiProperty({ type: [SalesOrderItemResponseDto] }) items!: SalesOrderItemResponseDto[];
  @ApiProperty() createdBy!: SalesOrderRelationDto;
  @ApiProperty({ nullable: true }) confirmedBy!: SalesOrderRelationDto | null;
  @ApiProperty({ nullable: true }) cancelledBy!: SalesOrderRelationDto | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ nullable: true }) confirmedAt!: string | null;
  @ApiProperty({ nullable: true }) cancelledAt!: string | null;
  @ApiProperty({ nullable: true }) cancellationReason!: string | null;
}

export class PaginatedSalesOrdersDto {
  @ApiProperty({ type: [SalesOrderResponseDto] }) data!: SalesOrderResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
