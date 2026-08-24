import { ApiPropertyOptional } from '@nestjs/swagger';
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

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export enum AnalyticsSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class AnalyticsPeriodQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE)
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-30' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE)
  endDate?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  warehouseId?: string;
}

export enum AnalyticsSalesSortField {
  ORDER_DATE = 'orderDate',
  NUMBER = 'number',
  TOTAL_AMOUNT = 'totalAmount',
  STATUS = 'status',
}

export enum AnalyticsPurchaseSortField {
  CREATED_AT = 'createdAt',
  NUMBER = 'number',
  TOTAL_AMOUNT = 'totalAmount',
  STATUS = 'status',
}

export enum AnalyticsInventorySortField {
  PRODUCT_NAME = 'productName',
  SKU = 'sku',
  AVAILABLE = 'available',
}

export class AnalyticsReportQueryDto extends AnalyticsPeriodQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: AnalyticsSortOrder, default: AnalyticsSortOrder.DESC })
  @IsOptional()
  @IsEnum(AnalyticsSortOrder)
  sortOrder = AnalyticsSortOrder.DESC;
}

export class AnalyticsSalesQueryDto extends AnalyticsReportQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsSalesSortField,
    default: AnalyticsSalesSortField.ORDER_DATE,
  })
  @IsOptional()
  @IsEnum(AnalyticsSalesSortField)
  sortBy = AnalyticsSalesSortField.ORDER_DATE;
}

export class AnalyticsPurchasesQueryDto extends AnalyticsReportQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsPurchaseSortField,
    default: AnalyticsPurchaseSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(AnalyticsPurchaseSortField)
  sortBy = AnalyticsPurchaseSortField.CREATED_AT;
}

export class AnalyticsInventoryQueryDto extends AnalyticsReportQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsInventorySortField,
    default: AnalyticsInventorySortField.PRODUCT_NAME,
  })
  @IsOptional()
  @IsEnum(AnalyticsInventorySortField)
  sortBy = AnalyticsInventorySortField.PRODUCT_NAME;
}
