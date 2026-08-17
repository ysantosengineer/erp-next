import { CustomerType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
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
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const decimalPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

export class CustomerAddressDto {
  @ApiPropertyOptional({ example: '80010000' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^(?:\d{8}|\d{5}-\d{3})$/)
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

export class CreateCustomerDto {
  @ApiProperty({ enum: CustomerType }) @IsEnum(CustomerType) type!: CustomerType;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(160) tradeName?:
    string | null;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(11) @MaxLength(18) document!: string;
  @ApiPropertyOptional()
  @Transform(lower)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(20) phone?:
    string | null;
  @ApiPropertyOptional({ default: '0.00', example: '1500.50' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(decimalPattern)
  creditLimit?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(2000) notes?:
    string | null;
  @ApiPropertyOptional({ type: CustomerAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;
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
  @Transform(lower)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(20) phone?:
    string | null;
  @ApiPropertyOptional({ example: '1500.50' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(decimalPattern)
  creditLimit?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(2000) notes?:
    string | null;
  @ApiPropertyOptional({ type: CustomerAddressDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto | null;
}

export class UpdateCustomerStatusDto {
  @ApiProperty() @IsBoolean() isActive!: boolean;
}

export enum CustomerStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum CustomerSortField {
  NAME = 'name',
  DOCUMENT = 'document',
  CREDIT_LIMIT = 'creditLimit',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListCustomersQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ enum: CustomerStatusFilter })
  @IsOptional()
  @IsEnum(CustomerStatusFilter)
  status?: CustomerStatusFilter;
  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;
  @ApiPropertyOptional({ enum: CustomerSortField, default: CustomerSortField.NAME })
  @IsOptional()
  @IsEnum(CustomerSortField)
  sortBy: CustomerSortField = CustomerSortField.NAME;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}

export class CustomerAddressResponseDto extends CustomerAddressDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
}

export class CustomerResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: CustomerType }) type!: CustomerType;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() tradeName!: string | null;
  @ApiProperty() document!: string;
  @ApiPropertyOptional() email!: string | null;
  @ApiPropertyOptional() phone!: string | null;
  @ApiProperty({ example: '1500.50' }) creditLimit!: string;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional({ type: CustomerAddressResponseDto })
  address!: CustomerAddressResponseDto | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class PaginatedCustomersDto {
  @ApiProperty({ type: [CustomerResponseDto] }) data!: CustomerResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
