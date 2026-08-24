import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
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
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const POSITIVE_QUANTITY = /^(?=.{1,19}$)(?=.*[1-9])(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/;

export enum InventorySortField {
  QUANTITY = 'quantity',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ListInventoryBalancesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') productId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') warehouseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') locationId?: string;
  @ApiPropertyOptional({ enum: InventorySortField, default: InventorySortField.UPDATED_AT })
  @IsOptional()
  @IsEnum(InventorySortField)
  sortBy: InventorySortField = InventorySortField.UPDATED_AT;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}

export class ListStockMovementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') productId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') warehouseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') locationId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') performedByUserId?: string;
  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}

export class MovementBaseDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') productId!: string;
  @ApiProperty({ example: '10.5000' })
  @Transform(trim)
  @IsString()
  @Matches(POSITIVE_QUANTITY, { message: 'Quantidade deve ser decimal positiva com até 4 casas.' })
  quantity!: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

export class StockEntryDto extends MovementBaseDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') destinationLocationId!: string;
  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class StockExitDto extends MovementBaseDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') sourceLocationId!: string;
  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class StockAdjustmentDto extends MovementBaseDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') locationId!: string;
  @ApiProperty({ enum: ['IN', 'OUT'] }) @IsEnum({ IN: 'IN', OUT: 'OUT' }) direction!: 'IN' | 'OUT';
  @ApiProperty({ maxLength: 1000 })
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  @Matches(/\S/, { message: 'Motivo é obrigatório.' })
  reason!: string;
}

export class StockTransferDto extends MovementBaseDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') sourceLocationId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') destinationLocationId!: string;
  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class InventoryBalanceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Saldo físico.' }) quantity!: string;
  @ApiProperty({ description: 'Soma das reservas ativas.' }) reservedQuantity!: string;
  @ApiProperty({ description: 'Saldo físico menos reservas ativas.' }) availableQuantity!: string;
  @ApiProperty() product!: object;
  @ApiProperty() location!: object;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class StockMovementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: StockMovementType }) type!: StockMovementType;
  @ApiProperty() quantity!: string;
  @ApiProperty() product!: object;
  @ApiPropertyOptional() sourceLocation!: object | null;
  @ApiPropertyOptional() destinationLocation!: object | null;
  @ApiPropertyOptional() reason!: string | null;
  @ApiProperty() referenceType!: string;
  @ApiPropertyOptional() referenceId!: string | null;
  @ApiProperty() performedBy!: object;
  @ApiProperty() createdAt!: string;
}

export class PaginatedInventoryBalancesDto {
  @ApiProperty({ type: [InventoryBalanceResponseDto] }) data!: InventoryBalanceResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

export class PaginatedStockMovementsDto {
  @ApiProperty({ type: [StockMovementResponseDto] }) data!: StockMovementResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
