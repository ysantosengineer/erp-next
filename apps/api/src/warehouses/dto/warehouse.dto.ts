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
const code = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]*$/;

export class CreateWarehouseDto {
  @ApiProperty({ minLength: 2, maxLength: 160 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'MAIN', description: 'Código humano normalizado em uppercase.' })
  @Transform(code)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: 'MAIN' })
  @Transform(code)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(CODE_PATTERN)
  code?: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class UpdateWarehouseStatusDto {
  @ApiProperty() @IsBoolean() isActive!: boolean;
}

export enum WarehouseStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum WarehouseSortField {
  NAME = 'name',
  CODE = 'code',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListWarehousesQueryDto {
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
  @ApiPropertyOptional({ enum: WarehouseStatusFilter })
  @IsOptional()
  @IsEnum(WarehouseStatusFilter)
  status?: WarehouseStatusFilter;
  @ApiPropertyOptional({ enum: WarehouseSortField, default: WarehouseSortField.NAME })
  @IsOptional()
  @IsEnum(WarehouseSortField)
  sortBy: WarehouseSortField = WarehouseSortField.NAME;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}

export class WarehouseResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ description: 'Quantidade total de endereços vinculados.' }) locationCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class PaginatedWarehousesDto {
  @ApiProperty({ type: [WarehouseResponseDto] }) data!: WarehouseResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
