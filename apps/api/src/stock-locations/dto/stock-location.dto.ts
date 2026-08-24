import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]*$/;
const CAPACITY_PATTERN = /^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/;

export class CreateStockLocationDto {
  @ApiProperty({ example: 'A-03-B-02-04', description: 'Código humano único no depósito.' })
  @Transform(upper)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'A' })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  zone?: string | null;
  @ApiPropertyOptional({ example: '03' })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  aisle?: string | null;
  @ApiPropertyOptional({ example: 'B' })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  rack?: string | null;
  @ApiPropertyOptional({ example: '02' })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  level?: string | null;
  @ApiPropertyOptional({ example: '04' })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  position?: string | null;

  @ApiPropertyOptional({
    example: '100.000',
    description: 'Capacidade lógica genérica e não negativa.',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(CAPACITY_PATTERN)
  capacity?: string | null;
}

export class UpdateStockLocationDto {
  @ApiPropertyOptional({ example: 'A-03-B-02-04' })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(CODE_PATTERN)
  code?: string;
  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  zone?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  aisle?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  rack?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  level?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  position?: string | null;
  @ApiPropertyOptional({ nullable: true, example: '100.000' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(CAPACITY_PATTERN)
  capacity?: string | null;
}

export class UpdateStockLocationStatusDto {
  @ApiProperty() @IsBoolean() isActive!: boolean;
}

export enum StockLocationStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum StockLocationSortField {
  CODE = 'code',
  ZONE = 'zone',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListStockLocationsQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
  @ApiPropertyOptional({ enum: StockLocationStatusFilter })
  @IsOptional()
  @IsEnum(StockLocationStatusFilter)
  status?: StockLocationStatusFilter;
  @ApiPropertyOptional({ maxLength: 40 })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  zone?: string;
  @ApiPropertyOptional({ enum: StockLocationSortField, default: StockLocationSortField.CODE })
  @IsOptional()
  @IsEnum(StockLocationSortField)
  sortBy: StockLocationSortField = StockLocationSortField.CODE;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}

export class StockLocationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) warehouseId!: string;
  @ApiProperty() code!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) zone!: string | null;
  @ApiPropertyOptional({ nullable: true }) aisle!: string | null;
  @ApiPropertyOptional({ nullable: true }) rack!: string | null;
  @ApiPropertyOptional({ nullable: true }) level!: string | null;
  @ApiPropertyOptional({ nullable: true }) position!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '100.000' }) capacity!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class StockLocationWarehouseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiProperty() isActive!: boolean;
}

export class PaginatedStockLocationsDto {
  @ApiProperty({ type: StockLocationWarehouseDto }) warehouse!: StockLocationWarehouseDto;
  @ApiProperty({ type: [StockLocationResponseDto] }) data!: StockLocationResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
