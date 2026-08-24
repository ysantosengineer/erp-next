import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
const QUANTITY = /^(?=.*[1-9])(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class PurchaseReceiptItemInputDto {
  @ApiProperty({ format: 'uuid', description: 'Item pertencente ao pedido aprovado.' })
  @IsUUID('4')
  purchaseOrderItemId!: string;

  @ApiProperty({ format: 'uuid', description: 'Endereço ativo do depósito do pedido.' })
  @IsUUID('4')
  locationId!: string;

  @ApiProperty({ example: '5.2500', description: 'Quantidade positiva, limitada ao pendente.' })
  @IsString()
  @Matches(QUANTITY, { message: 'Quantidade recebida inválida.' })
  receivedQuantity!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  discrepancyReason?: string | null;
}

export class CreatePurchaseReceiptDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  purchaseOrderId!: string;

  @ApiProperty({ format: 'uuid', description: 'Chave estável reutilizada em retries.' })
  @IsUUID('4')
  idempotencyKey!: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @ApiProperty({ type: [PurchaseReceiptItemInputDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um item para recebimento.' })
  @ArrayMaxSize(100, { message: 'O recebimento aceita no máximo 100 itens.' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceiptItemInputDto)
  items!: PurchaseReceiptItemInputDto[];
}

export enum PurchaseReceiptSortField {
  NUMBER = 'number',
  RECEIVED_AT = 'receivedAt',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListPurchaseReceiptsQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID('4') purchaseOrderId?: string;
  @IsOptional() @IsUUID('4') supplierId?: string;
  @IsOptional() @IsUUID('4') warehouseId?: string;
  @IsOptional() @IsString() @Matches(DATE) @IsDateString({ strict: true }) startDate?: string;
  @IsOptional() @IsString() @Matches(DATE) @IsDateString({ strict: true }) endDate?: string;
  @IsOptional() @IsEnum(PurchaseReceiptSortField) sortBy = PurchaseReceiptSortField.RECEIVED_AT;
  @IsOptional() @IsEnum(SortOrder) sortOrder = SortOrder.DESC;
}

class RelationDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class PurchaseReceiptItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() purchaseOrderItemId!: string;
  @ApiProperty() product!: RelationDto & { sku: string; unitSymbol: string };
  @ApiProperty() location!: RelationDto & { code: string };
  @ApiProperty() orderedQuantity!: string;
  @ApiProperty() previouslyReceivedQuantity!: string;
  @ApiProperty() receivedQuantity!: string;
  @ApiProperty() remainingQuantity!: string;
  @ApiProperty() unitCost!: string;
  @ApiProperty({ nullable: true }) discrepancyReason!: string | null;
}

export class PurchaseReceiptResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'PR-000001' }) number!: string;
  @ApiProperty() purchaseOrder!: RelationDto & { number: string; status: string };
  @ApiProperty() supplier!: RelationDto;
  @ApiProperty() warehouse!: RelationDto & { code: string };
  @ApiProperty() receivedAt!: string;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() receivedBy!: RelationDto;
  @ApiProperty({ type: [PurchaseReceiptItemResponseDto] }) items!: PurchaseReceiptItemResponseDto[];
  @ApiProperty() itemCount!: number;
  @ApiProperty() totalQuantity!: string;
  @ApiProperty() createdAt!: string;
}

export class PaginatedPurchaseReceiptsDto {
  @ApiProperty({ type: [PurchaseReceiptResponseDto] }) data!: PurchaseReceiptResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

export class PurchaseOrderReceivableResponseDto {
  @ApiProperty() orderId!: string;
  @ApiProperty() number!: string;
  @ApiProperty() status!: string;
  @ApiProperty() supplier!: RelationDto;
  @ApiProperty() warehouse!: RelationDto & { code: string };
  @ApiProperty() items!: unknown[];
  @ApiProperty() locations!: unknown[];
}
