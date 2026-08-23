import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryCountStatus } from '@prisma/client';
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
const NON_NEGATIVE_QUANTITY = /^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/;

export enum InventoryCountSortField {
  CREATED_AT = 'createdAt',
  STARTED_AT = 'startedAt',
  STATUS = 'status',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListInventoryCountsQueryDto {
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
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID('4') warehouseId?: string;
  @ApiPropertyOptional({ enum: InventoryCountStatus })
  @IsOptional()
  @IsEnum(InventoryCountStatus)
  status?: InventoryCountStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional({
    enum: InventoryCountSortField,
    default: InventoryCountSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(InventoryCountSortField)
  sortBy: InventoryCountSortField = InventoryCountSortField.CREATED_AT;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}

export class InventoryCountDetailQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) itemsPage = 1;
  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  itemsLimit = 50;
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  itemSearch?: string;
}

export class InventoryCountOptionsQueryDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') warehouseId!: string;
}

export class CreateInventoryCountDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') warehouseId!: string;
  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class AddInventoryCountItemDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') productId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') locationId!: string;
}

export class SubmitInventoryCountQuantityDto {
  @ApiProperty({ example: '10.5000' })
  @Transform(trim)
  @IsString()
  @Matches(NON_NEGATIVE_QUANTITY, {
    message: 'Quantidade deve ser decimal não negativa com até 4 casas.',
  })
  quantity!: string;
}

export class InventoryCountResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: InventoryCountStatus }) status!: InventoryCountStatus;
  @ApiProperty() warehouse!: object;
  @ApiPropertyOptional() description!: string | null;
  @ApiProperty() summary!: object;
  @ApiProperty() createdBy!: object;
  @ApiPropertyOptional() approvedBy!: object | null;
  @ApiPropertyOptional() startedAt!: string | null;
  @ApiPropertyOptional() completedAt!: string | null;
  @ApiPropertyOptional() approvedAt!: string | null;
  @ApiPropertyOptional() cancelledAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class InventoryCountDetailResponseDto extends InventoryCountResponseDto {
  @ApiProperty() items!: object;
  @ApiProperty({ type: [Object] }) movements!: object[];
}

export class PaginatedInventoryCountsDto {
  @ApiProperty({ type: [InventoryCountResponseDto] }) data!: InventoryCountResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
