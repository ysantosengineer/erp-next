import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';
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

export class PurchaseOrderItemInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({ example: '5.2500', description: 'Decimal positivo com até quatro casas.' })
  @IsString()
  @Matches(QUANTITY, { message: 'Quantidade inválida.' })
  quantity!: string;

  @ApiProperty({ example: '12.50', description: 'Decimal não negativo com até duas casas.' })
  @IsString()
  @Matches(MONEY, { message: 'Custo unitário inválido.' })
  unitCost!: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  supplierId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  warehouseId!: string;

  @ApiPropertyOptional({ example: '2026-09-15', description: 'Data civil YYYY-MM-DD.' })
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

  @ApiPropertyOptional({ default: '0.00' })
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

  @ApiProperty({ type: [PurchaseOrderItemInputDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido deve possuir ao menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items!: PurchaseOrderItemInputDto[];
}

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

export class CancelPurchaseOrderDto {
  @ApiProperty({ minLength: 3, maxLength: 500 })
  @Transform(trim)
  @IsString()
  @Matches(/.*\S.*/, { message: 'Informe o motivo do cancelamento.' })
  @MaxLength(500)
  reason!: string;
}

export enum PurchaseOrderSortField {
  NUMBER = 'number',
  CREATED_AT = 'createdAt',
  EXPECTED_DELIVERY_DATE = 'expectedDeliveryDate',
  TOTAL_AMOUNT = 'totalAmount',
  STATUS = 'status',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListPurchaseOrdersQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus;
  @IsOptional() @IsUUID('4') supplierId?: string;
  @IsOptional() @IsUUID('4') warehouseId?: string;
  @IsOptional() @IsString() @Matches(DATE) startDate?: string;
  @IsOptional() @IsString() @Matches(DATE) endDate?: string;
  @IsOptional() @IsString() @Matches(DATE) expectedDeliveryFrom?: string;
  @IsOptional() @IsString() @Matches(DATE) expectedDeliveryTo?: string;
  @IsOptional() @IsEnum(PurchaseOrderSortField) sortBy = PurchaseOrderSortField.CREATED_AT;
  @IsOptional() @IsEnum(SortOrder) sortOrder = SortOrder.DESC;
}

export class PurchaseOrderOptionsQueryDto {
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) productSearch?: string;
}

export class PurchaseOrderItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() productSku!: string;
  @ApiProperty() unitSymbol!: string;
  @ApiProperty() quantity!: string;
  @ApiProperty() unitCost!: string;
  @ApiProperty() subtotal!: string;
  @ApiProperty() receivedQuantity!: string;
}

class PurchaseOrderRelationDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class PurchaseOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'PO-000001' }) number!: string;
  @ApiProperty({ enum: PurchaseOrderStatus }) status!: PurchaseOrderStatus;
  @ApiProperty() supplier!: PurchaseOrderRelationDto & { document: string };
  @ApiProperty() warehouse!: PurchaseOrderRelationDto & { code: string };
  @ApiProperty({ nullable: true }) expectedDeliveryDate!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() subtotal!: string;
  @ApiProperty() discountAmount!: string;
  @ApiProperty() freightAmount!: string;
  @ApiProperty() otherAmount!: string;
  @ApiProperty() totalAmount!: string;
  @ApiProperty({ type: [PurchaseOrderItemResponseDto] }) items!: PurchaseOrderItemResponseDto[];
  @ApiProperty() createdBy!: PurchaseOrderRelationDto;
  @ApiProperty({ nullable: true }) approvedBy!: PurchaseOrderRelationDto | null;
  @ApiProperty({ nullable: true }) cancelledBy!: PurchaseOrderRelationDto | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ nullable: true }) approvedAt!: string | null;
  @ApiProperty({ nullable: true }) cancelledAt!: string | null;
  @ApiProperty({ nullable: true }) cancellationReason!: string | null;
}

export class PaginatedPurchaseOrdersDto {
  @ApiProperty({ type: [PurchaseOrderResponseDto] }) data!: PurchaseOrderResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
