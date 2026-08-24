import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockReservationStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListStockReservationsQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') salesOrderId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') productId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') warehouseId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') locationId?: string;
  @ApiPropertyOptional({ enum: StockReservationStatus })
  @IsOptional()
  @IsEnum(StockReservationStatus)
  status?: StockReservationStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

export class ShipSalesOrderDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class StockReservationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: StockReservationStatus }) status!: StockReservationStatus;
  @ApiProperty() quantity!: string;
  @ApiProperty() salesOrder!: object;
  @ApiProperty() salesOrderItemId!: string;
  @ApiProperty() product!: object;
  @ApiProperty() location!: object;
  @ApiProperty() createdBy!: object;
  @ApiPropertyOptional() releasedBy!: object | null;
  @ApiPropertyOptional() consumedBy!: object | null;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional() releasedAt!: string | null;
  @ApiPropertyOptional() consumedAt!: string | null;
}

export class PaginatedStockReservationsDto {
  @ApiProperty({ type: [StockReservationResponseDto] }) data!: StockReservationResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

export class SalesOrderStockOperationResponseDto {
  @ApiProperty() orderId!: string;
  @ApiProperty() number!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [StockReservationResponseDto] })
  reservations!: StockReservationResponseDto[];
}
