import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const sku = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLocaleUpperCase('pt-BR') : value;
const barcode = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.replace(/\s/g, '');
  return normalized || null;
};

const MONEY_PATTERN = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const QUANTITY_PATTERN = /^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._/-]*$/;
const BARCODE_PATTERN = /^\d{8,14}$/;

export class CreateProductDto {
  @ApiProperty({ minLength: 2, maxLength: 160 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @ApiProperty({ example: 'PROD-001', description: 'Normalizado em letras maiúsculas.' })
  @Transform(sku)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(SKU_PATTERN, { message: 'SKU deve usar letras, números e separadores - _ . /.' })
  sku!: string;

  @ApiPropertyOptional({ example: '7891234567890', nullable: true })
  @Transform(barcode)
  @IsOptional()
  @IsString()
  @Matches(BARCODE_PATTERN, { message: 'Código de barras deve conter de 8 a 14 dígitos.' })
  barcode?: string | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  categoryId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  unitId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  primarySupplierId?: string | null;

  @ApiProperty({ example: '10.50', description: 'Decimal com até duas casas.' })
  @IsString()
  @Matches(MONEY_PATTERN, { message: 'Preço de custo inválido.' })
  costPrice!: string;

  @ApiProperty({ example: '15.90', description: 'Decimal com até duas casas.' })
  @IsString()
  @Matches(MONEY_PATTERN, { message: 'Preço de venda inválido.' })
  salePrice!: string;

  @ApiPropertyOptional({ example: '1.250', description: 'Peso em quilogramas.' })
  @IsOptional()
  @IsString()
  @Matches(QUANTITY_PATTERN, { message: 'Peso inválido.' })
  weight?: string | null;

  @ApiPropertyOptional({ example: '10.500', description: 'Altura em centímetros.' })
  @IsOptional()
  @IsString()
  @Matches(QUANTITY_PATTERN, { message: 'Altura inválida.' })
  height?: string | null;

  @ApiPropertyOptional({ example: '20.000', description: 'Largura em centímetros.' })
  @IsOptional()
  @IsString()
  @Matches(QUANTITY_PATTERN, { message: 'Largura inválida.' })
  width?: string | null;

  @ApiPropertyOptional({ example: '30.000', description: 'Comprimento em centímetros.' })
  @IsOptional()
  @IsString()
  @Matches(QUANTITY_PATTERN, { message: 'Comprimento inválido.' })
  length?: string | null;

  @ApiPropertyOptional({ example: '5.000', default: '0.000' })
  @IsOptional()
  @IsString()
  @Matches(QUANTITY_PATTERN, { message: 'Estoque mínimo inválido.' })
  minimumStock?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class UpdateProductStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export enum ProductStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ProductSortField {
  NAME = 'name',
  SKU = 'sku',
  COST_PRICE = 'costPrice',
  SALE_PRICE = 'salePrice',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListProductsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

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

  @ApiPropertyOptional({ enum: ProductStatusFilter })
  @IsOptional()
  @IsEnum(ProductStatusFilter)
  status?: ProductStatusFilter;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  unitId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @ApiPropertyOptional({ enum: ProductSortField, default: ProductSortField.NAME })
  @IsOptional()
  @IsEnum(ProductSortField)
  sortBy: ProductSortField = ProductSortField.NAME;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}

export class ProductCategoryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() isActive!: boolean;
}

export class ProductUnitResponseDto extends ProductCategoryResponseDto {
  @ApiProperty() symbol!: string;
}

export class ProductSupplierResponseDto extends ProductCategoryResponseDto {
  @ApiProperty() document!: string;
}

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional({ nullable: true }) barcode!: string | null;
  @ApiProperty({ example: '10.50' }) costPrice!: string;
  @ApiProperty({ example: '15.90' }) salePrice!: string;
  @ApiPropertyOptional({ nullable: true, example: '1.250' }) weight!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '10.500' }) height!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '20.000' }) width!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '30.000' }) length!: string | null;
  @ApiProperty({ example: '5.000' }) minimumStock!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: ProductCategoryResponseDto }) category!: ProductCategoryResponseDto;
  @ApiProperty({ type: ProductUnitResponseDto }) unit!: ProductUnitResponseDto;
  @ApiPropertyOptional({ type: ProductSupplierResponseDto, nullable: true })
  primarySupplier!: ProductSupplierResponseDto | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class PaginatedProductsDto {
  @ApiProperty({ type: [ProductResponseDto] }) data!: ProductResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
