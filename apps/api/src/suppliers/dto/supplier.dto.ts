import { SupplierType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
export class SupplierAddressDto {
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(8)
  postalCode?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(160) street?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(20) number?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional()
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  state?: string;
  @ApiPropertyOptional({ default: 'BR' })
  @Transform(upper)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;
}
export class CreateSupplierDto {
  @ApiProperty({ enum: SupplierType }) @IsEnum(SupplierType) type!: SupplierType;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(160) tradeName?:
    string | null;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(11) @MaxLength(18) document!: string;
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(20) phone?:
    string | null;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(120) contactName?:
    string | null;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(2000) notes?:
    string | null;
  @ApiPropertyOptional({ type: SupplierAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierAddressDto)
  address?: SupplierAddressDto;
}
export class UpdateSupplierDto {
  @ApiPropertyOptional({ enum: SupplierType })
  @IsOptional()
  @IsEnum(SupplierType)
  type?: SupplierType;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(160) tradeName?:
    string | null;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(11)
  @MaxLength(18)
  document?: string;
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(20) phone?:
    string | null;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(120) contactName?:
    string | null;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(2000) notes?:
    string | null;
  @ApiPropertyOptional({ type: SupplierAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierAddressDto)
  address?: SupplierAddressDto;
}
export class UpdateSupplierStatusDto {
  @ApiProperty() @IsBoolean() isActive!: boolean;
}
export enum SupplierStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
export enum SupplierSortField {
  NAME = 'name',
  DOCUMENT = 'document',
  CREATED_AT = 'createdAt',
}
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
export class ListSuppliersQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ enum: SupplierStatusFilter })
  @IsOptional()
  @IsEnum(SupplierStatusFilter)
  status?: SupplierStatusFilter;
  @ApiPropertyOptional({ enum: SupplierType })
  @IsOptional()
  @IsEnum(SupplierType)
  type?: SupplierType;
  @ApiPropertyOptional({ enum: SupplierSortField, default: SupplierSortField.NAME })
  @IsOptional()
  @IsEnum(SupplierSortField)
  sortBy: SupplierSortField = SupplierSortField.NAME;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}
export class SupplierAddressResponseDto extends SupplierAddressDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
}
export class SupplierResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: SupplierType }) type!: SupplierType;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() tradeName!: string | null;
  @ApiProperty() document!: string;
  @ApiPropertyOptional() email!: string | null;
  @ApiPropertyOptional() phone!: string | null;
  @ApiPropertyOptional() contactName!: string | null;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional({ type: SupplierAddressResponseDto })
  address!: SupplierAddressResponseDto | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
export class PaginatedSuppliersDto {
  @ApiProperty({ type: [SupplierResponseDto] }) data!: SupplierResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
