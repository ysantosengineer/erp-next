import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  @ApiProperty() @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(500) description?: string;
}
export class UpdateCategoryDto {
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(500) description?: string;
}
export class UpdateCategoryStatusDto { @ApiProperty() @IsBoolean() isActive!: boolean; }
export enum CategoryStatusFilter { ACTIVE = 'active', INACTIVE = 'inactive' }
export enum CategorySortField { NAME = 'name', CREATED_AT = 'createdAt' }
export enum SortOrder { ASC = 'asc', DESC = 'desc' }
export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ enum: CategoryStatusFilter }) @IsOptional() @IsEnum(CategoryStatusFilter) status?: CategoryStatusFilter;
  @ApiPropertyOptional({ enum: CategorySortField, default: CategorySortField.NAME }) @IsOptional() @IsEnum(CategorySortField) sortBy: CategorySortField = CategorySortField.NAME;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC }) @IsOptional() @IsEnum(SortOrder) sortOrder: SortOrder = SortOrder.ASC;
}
export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string; @ApiProperty() name!: string; @ApiPropertyOptional() description!: string | null;
  @ApiProperty() isActive!: boolean; @ApiProperty() createdAt!: string; @ApiProperty() updatedAt!: string;
}
export class PaginatedCategoriesDto { @ApiProperty({ type: [CategoryResponseDto] }) data!: CategoryResponseDto[]; @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto; }
