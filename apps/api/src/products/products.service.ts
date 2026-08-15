import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  ListProductsQueryDto,
  ProductResponseDto,
  ProductStatusFilter,
  UpdateProductDto,
} from './dto/product.dto';

const productInclude = {
  category: { select: { id: true, name: true, isActive: true } },
  unit: { select: { id: true, name: true, symbol: true, isActive: true } },
  primarySupplier: {
    select: { id: true, name: true, document: true, isActive: true },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(identity: AuthenticatedUser, query: ListProductsQueryDto) {
    const barcodeSearch = query.search?.replace(/\D/g, '');
    const where: Prisma.ProductWhereInput = {
      companyId: identity.companyId,
      ...(query.status ? { isActive: query.status === ProductStatusFilter.ACTIVE } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(query.supplierId ? { primarySupplierId: query.supplierId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              ...(barcodeSearch ? [{ barcode: { contains: barcodeSearch } }] : []),
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((product) => this.toResponse(product)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(identity: AuthenticatedUser, dto: CreateProductDto, requestId: string) {
    await this.ensureCategory(identity.companyId, dto.categoryId);
    await this.ensureUnit(identity.companyId, dto.unitId);
    if (dto.primarySupplierId) {
      await this.ensureSupplier(identity.companyId, dto.primarySupplierId);
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            companyId: identity.companyId,
            categoryId: dto.categoryId,
            unitId: dto.unitId,
            primarySupplierId: dto.primarySupplierId ?? null,
            name: dto.name.trim(),
            description: this.optionalText(dto.description),
            sku: this.normalizeSku(dto.sku),
            barcode: this.normalizeBarcode(dto.barcode),
            costPrice: new Prisma.Decimal(dto.costPrice),
            salePrice: new Prisma.Decimal(dto.salePrice),
            weight: this.optionalDecimal(dto.weight),
            height: this.optionalDecimal(dto.height),
            width: this.optionalDecimal(dto.width),
            length: this.optionalDecimal(dto.length),
            minimumStock: new Prisma.Decimal(dto.minimumStock ?? '0'),
          },
          include: productInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Product',
            entityId: created.id,
            action: 'product.created',
            after: this.auditSnapshot(created),
            requestId,
          },
        });
        return created;
      });
      return this.toResponse(product);
    } catch (error: unknown) {
      this.rethrowUnique(error);
    }
  }

  async findOne(identity: AuthenticatedUser, id: string) {
    return this.toResponse(await this.getScoped(identity.companyId, id));
  }

  async update(identity: AuthenticatedUser, id: string, dto: UpdateProductDto, requestId: string) {
    this.ensureRequiredFieldsNotNull(dto);
    const current = await this.getScoped(identity.companyId, id);
    if (dto.categoryId && dto.categoryId !== current.categoryId) {
      await this.ensureCategory(identity.companyId, dto.categoryId);
    }
    if (dto.unitId && dto.unitId !== current.unitId) {
      await this.ensureUnit(identity.companyId, dto.unitId);
    }
    if (dto.primarySupplierId && dto.primarySupplierId !== current.primarySupplierId) {
      await this.ensureSupplier(identity.companyId, dto.primarySupplierId);
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id },
          data: {
            ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
            ...(dto.unitId !== undefined ? { unitId: dto.unitId } : {}),
            ...(dto.primarySupplierId !== undefined
              ? { primarySupplierId: dto.primarySupplierId }
              : {}),
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.description !== undefined
              ? { description: this.optionalText(dto.description) }
              : {}),
            ...(dto.sku !== undefined ? { sku: this.normalizeSku(dto.sku) } : {}),
            ...(dto.barcode !== undefined ? { barcode: this.normalizeBarcode(dto.barcode) } : {}),
            ...(dto.costPrice !== undefined
              ? { costPrice: new Prisma.Decimal(dto.costPrice) }
              : {}),
            ...(dto.salePrice !== undefined
              ? { salePrice: new Prisma.Decimal(dto.salePrice) }
              : {}),
            ...(dto.weight !== undefined ? { weight: this.optionalDecimal(dto.weight) } : {}),
            ...(dto.height !== undefined ? { height: this.optionalDecimal(dto.height) } : {}),
            ...(dto.width !== undefined ? { width: this.optionalDecimal(dto.width) } : {}),
            ...(dto.length !== undefined ? { length: this.optionalDecimal(dto.length) } : {}),
            ...(dto.minimumStock !== undefined
              ? { minimumStock: new Prisma.Decimal(dto.minimumStock) }
              : {}),
          },
          include: productInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Product',
            entityId: id,
            action: 'product.updated',
            before: this.auditSnapshot(current),
            after: {
              ...this.auditSnapshot(updated),
              changedFields: Object.keys(dto),
            },
            requestId,
          },
        });
        return updated;
      });
      return this.toResponse(product);
    } catch (error: unknown) {
      this.rethrowUnique(error);
    }
  }

  async updateStatus(
    identity: AuthenticatedUser,
    id: string,
    isActive: boolean,
    requestId: string,
  ) {
    const current = await this.getScoped(identity.companyId, id);
    const product = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: { isActive },
        include: productInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId: identity.userId,
          companyId: identity.companyId,
          entity: 'Product',
          entityId: id,
          action: isActive ? 'product.activated' : 'product.deactivated',
          before: { isActive: current.isActive },
          after: { isActive },
          requestId,
        },
      });
      return updated;
    });
    return this.toResponse(product);
  }

  private async getScoped(companyId: string, id: string): Promise<ProductWithRelations> {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    }
    return product;
  }

  private async ensureCategory(companyId: string, id: string): Promise<void> {
    const category = await this.prisma.category.findFirst({ where: { id, companyId } });
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoria não encontrada.',
      });
    }
    if (!category.isActive) {
      throw new UnprocessableEntityException({
        code: 'CATEGORY_INACTIVE',
        message: 'A categoria selecionada está inativa.',
      });
    }
  }

  private async ensureUnit(companyId: string, id: string): Promise<void> {
    const unit = await this.prisma.unitOfMeasure.findFirst({ where: { id, companyId } });
    if (!unit) {
      throw new NotFoundException({
        code: 'UNIT_NOT_FOUND',
        message: 'Unidade de medida não encontrada.',
      });
    }
    if (!unit.isActive) {
      throw new UnprocessableEntityException({
        code: 'UNIT_INACTIVE',
        message: 'A unidade selecionada está inativa.',
      });
    }
  }

  private async ensureSupplier(companyId: string, id: string): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, companyId } });
    if (!supplier) {
      throw new NotFoundException({
        code: 'SUPPLIER_NOT_FOUND',
        message: 'Fornecedor não encontrado.',
      });
    }
    if (!supplier.isActive) {
      throw new UnprocessableEntityException({
        code: 'SUPPLIER_INACTIVE',
        message: 'O fornecedor selecionado está inativo.',
      });
    }
  }

  private normalizeSku(value: string): string {
    return value.trim().toLocaleUpperCase('pt-BR');
  }

  private ensureRequiredFieldsNotNull(dto: UpdateProductDto): void {
    const requiredFields = [
      'name',
      'sku',
      'categoryId',
      'unitId',
      'costPrice',
      'salePrice',
      'minimumStock',
    ] as const;
    const invalidField = requiredFields.find(
      (field) => Object.prototype.hasOwnProperty.call(dto, field) && dto[field] === null,
    );
    if (invalidField) {
      throw new BadRequestException({
        code: 'PRODUCT_REQUIRED_FIELD_NULL',
        message: `O campo ${invalidField} não aceita valor nulo.`,
      });
    }
  }

  private normalizeBarcode(value?: string | null): string | null {
    return value ? value.replace(/\D/g, '') || null : null;
  }

  private optionalText(value?: string | null): string | null {
    return value?.trim() || null;
  }

  private optionalDecimal(value?: string | null): Prisma.Decimal | null {
    return value ? new Prisma.Decimal(value) : null;
  }

  private rethrowUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.map(String)
        : [String(error.meta?.target ?? '')];
      if (target.some((field) => field.includes('barcode'))) {
        throw new ConflictException({
          code: 'PRODUCT_BARCODE_EXISTS',
          message: 'Código de barras já cadastrado nesta empresa.',
        });
      }
      throw new ConflictException({
        code: 'PRODUCT_SKU_EXISTS',
        message: 'SKU já cadastrado nesta empresa.',
      });
    }
    throw error;
  }

  private auditSnapshot(product: ProductWithRelations) {
    return {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      unitId: product.unitId,
      primarySupplierId: product.primarySupplierId,
      costPrice: product.costPrice.toFixed(2),
      salePrice: product.salePrice.toFixed(2),
    };
  }

  private toResponse(product: ProductWithRelations): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      costPrice: product.costPrice.toFixed(2),
      salePrice: product.salePrice.toFixed(2),
      weight: product.weight?.toFixed(3) ?? null,
      height: product.height?.toFixed(3) ?? null,
      width: product.width?.toFixed(3) ?? null,
      length: product.length?.toFixed(3) ?? null,
      minimumStock: product.minimumStock.toFixed(3),
      isActive: product.isActive,
      category: product.category,
      unit: product.unit,
      primarySupplier: product.primarySupplier,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
