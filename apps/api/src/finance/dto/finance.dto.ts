import {
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialPaymentMethod,
  FinancialReferenceType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const moneyPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

export enum FinancialSortField {
  NUMBER = 'number',
  ISSUE_DATE = 'issueDate',
  DUE_DATE = 'dueDate',
  ORIGINAL_AMOUNT = 'originalAmount',
  SETTLED_AMOUNT = 'settledAmount',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum CashFlowView {
  FORECAST = 'forecast',
  REALIZED = 'realized',
  COMBINED = 'combined',
}

export enum CashFlowGroupBy {
  DAY = 'day',
  MONTH = 'month',
}

export class CreateFinancialEntryDto {
  @ApiProperty({ enum: FinancialEntryType }) @IsEnum(FinancialEntryType) type!: FinancialEntryType;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(2) @MaxLength(200) description!: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') supplierId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') customerId?: string | null;
  @ApiProperty({ example: '2026-08-24' }) @IsDateString({ strict: true }) issueDate!: string;
  @ApiProperty({ example: '2026-09-24' }) @IsDateString({ strict: true }) dueDate!: string;
  @ApiProperty({ example: '1000.00' })
  @Transform(trim)
  @IsString()
  @Matches(moneyPattern)
  originalAmount!: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(2000) notes?:
    string | null;
  @ApiPropertyOptional({ enum: FinancialReferenceType, default: FinancialReferenceType.MANUAL })
  @IsOptional()
  @IsEnum(FinancialReferenceType)
  referenceType?: FinancialReferenceType;
  @ApiPropertyOptional()
  @ValidateIf(
    (value: CreateFinancialEntryDto) =>
      value.referenceId !== null && value.referenceId !== undefined,
  )
  @IsUUID('4')
  referenceId?: string | null;
}

export class UpdateFinancialEntryDto {
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') supplierId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') customerId?: string | null;
  @ApiPropertyOptional({ example: '2026-08-24' })
  @IsOptional()
  @IsDateString({ strict: true })
  issueDate?: string;
  @ApiPropertyOptional({ example: '2026-09-24' })
  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;
  @ApiPropertyOptional({ example: '1250.00' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(moneyPattern)
  originalAmount?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(2000) notes?:
    string | null;
  @ApiPropertyOptional({ enum: FinancialReferenceType })
  @IsOptional()
  @IsEnum(FinancialReferenceType)
  referenceType?: FinancialReferenceType;
  @ApiPropertyOptional()
  @ValidateIf(
    (value: UpdateFinancialEntryDto) =>
      value.referenceId !== null && value.referenceId !== undefined,
  )
  @IsUUID('4')
  referenceId?: string | null;
}

export class ListFinancialEntriesQueryDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional({ enum: FinancialEntryType })
  @IsOptional()
  @IsEnum(FinancialEntryType)
  type?: FinancialEntryType;
  @ApiPropertyOptional({ enum: FinancialEntryStatus })
  @IsOptional()
  @IsEnum(FinancialEntryStatus)
  status?: FinancialEntryStatus;
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? undefined : value === true || value === 'true',
  )
  @IsOptional()
  @IsBoolean()
  overdue?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString({ strict: true }) startDueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString({ strict: true }) endDueDate?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ enum: FinancialSortField, default: FinancialSortField.DUE_DATE })
  @IsOptional()
  @IsEnum(FinancialSortField)
  sortBy = FinancialSortField.DUE_DATE;
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder = SortOrder.ASC;
}

export class CreateFinancialSettlementDto {
  @ApiProperty({ example: '300.00' })
  @Transform(trim)
  @IsString()
  @Matches(moneyPattern)
  amount!: string;
  @ApiProperty({ example: '2026-08-24' }) @IsDateString({ strict: true }) settledAt!: string;
  @ApiProperty({ enum: FinancialPaymentMethod })
  @IsEnum(FinancialPaymentMethod)
  paymentMethod!: FinancialPaymentMethod;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(1000) notes?:
    string | null;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(8) @MaxLength(120) idempotencyKey!: string;
}

export class CancelFinancialEntryDto {
  @ApiProperty() @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

export class CashFlowQueryDto {
  @ApiProperty() @IsDateString({ strict: true }) startDate!: string;
  @ApiProperty() @IsDateString({ strict: true }) endDate!: string;
  @ApiPropertyOptional({ enum: CashFlowView, default: CashFlowView.COMBINED })
  @IsOptional()
  @IsEnum(CashFlowView)
  view = CashFlowView.COMBINED;
  @ApiPropertyOptional({ enum: CashFlowGroupBy, default: CashFlowGroupBy.DAY })
  @IsOptional()
  @IsEnum(CashFlowGroupBy)
  groupBy = CashFlowGroupBy.DAY;
}

export class FinanceSummaryQueryDto {
  @ApiProperty() @IsDateString({ strict: true }) startDate!: string;
  @ApiProperty() @IsDateString({ strict: true }) endDate!: string;
}

export class FinancialEntryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() number!: string;
  @ApiProperty({ enum: FinancialEntryType }) type!: FinancialEntryType;
  @ApiProperty({ enum: FinancialEntryStatus }) status!: FinancialEntryStatus;
  @ApiProperty() description!: string;
  @ApiProperty() originalAmount!: string;
  @ApiProperty() settledAmount!: string;
  @ApiProperty() remainingAmount!: string;
  @ApiProperty() overdue!: boolean;
  @ApiProperty() daysOverdue!: number;
}

export class PaginatedFinancialEntriesDto {
  @ApiProperty({ type: [FinancialEntryResponseDto] }) data!: FinancialEntryResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}
