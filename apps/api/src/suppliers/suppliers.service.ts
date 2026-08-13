import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SupplierType } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupplierDto,
  ListSuppliersQueryDto,
  SupplierAddressDto,
  SupplierResponseDto,
  SupplierStatusFilter,
  UpdateSupplierDto,
} from './dto/supplier.dto';
import { digitsOnly, isValidSupplierDocument } from './supplier-document.util';
const supplierInclude = {
  addresses: { where: { isPrimary: true }, take: 1 },
} satisfies Prisma.SupplierInclude;
type SupplierWithAddress = Prisma.SupplierGetPayload<{ include: typeof supplierInclude }>;
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(identity: AuthenticatedUser, query: ListSuppliersQueryDto) {
    const searchDocument = query.search ? digitsOnly(query.search) : '';
    const where: Prisma.SupplierWhereInput = {
      companyId: identity.companyId,
      ...(query.status ? { isActive: query.status === SupplierStatusFilter.ACTIVE } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { tradeName: { contains: query.search, mode: 'insensitive' } },
              { document: { contains: searchDocument || query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [suppliers, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        include: supplierInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return {
      data: suppliers.map((supplier) => this.toResponse(supplier)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async create(identity: AuthenticatedUser, dto: CreateSupplierDto, requestId: string) {
    const document = this.validateDocument(dto.type, dto.document);
    try {
      const supplier = await this.prisma.$transaction(async (tx) => {
        const created = await tx.supplier.create({
          data: {
            companyId: identity.companyId,
            type: dto.type,
            name: dto.name.trim(),
            tradeName: this.optional(dto.tradeName),
            document,
            email: this.normalizeEmail(dto.email),
            phone: dto.phone ? digitsOnly(dto.phone) : null,
            contactName: this.optional(dto.contactName),
            notes: this.optional(dto.notes),
            ...(dto.address ? { addresses: { create: this.addressData(dto.address) } } : {}),
          },
          include: supplierInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Supplier',
            entityId: created.id,
            action: 'supplier.created',
            after: {
              type: created.type,
              name: created.name,
              hasAddress: created.addresses.length > 0,
            },
            requestId,
          },
        });
        return created;
      });
      return this.toResponse(supplier);
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
    }
  }
  async findOne(identity: AuthenticatedUser, id: string) {
    return this.toResponse(await this.getScoped(identity.companyId, id));
  }
  async update(identity: AuthenticatedUser, id: string, dto: UpdateSupplierDto, requestId: string) {
    const current = await this.getScoped(identity.companyId, id);
    const type = dto.type ?? current.type;
    const document =
      dto.document !== undefined || dto.type !== undefined
        ? this.validateDocument(type, dto.document ?? current.document)
        : undefined;
    try {
      const supplier = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.supplier.update({
          where: { id },
          data: {
            ...(dto.type !== undefined ? { type: dto.type } : {}),
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.tradeName !== undefined ? { tradeName: this.optional(dto.tradeName) } : {}),
            ...(document !== undefined ? { document } : {}),
            ...(dto.email !== undefined ? { email: this.normalizeEmail(dto.email) } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone ? digitsOnly(dto.phone) : null } : {}),
            ...(dto.contactName !== undefined
              ? { contactName: this.optional(dto.contactName) }
              : {}),
            ...(dto.notes !== undefined ? { notes: this.optional(dto.notes) } : {}),
            ...(dto.address !== undefined
              ? {
                  addresses: {
                    deleteMany: { isPrimary: true },
                    create: this.addressData(dto.address),
                  },
                }
              : {}),
          },
          include: supplierInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Supplier',
            entityId: id,
            action: 'supplier.updated',
            before: {
              type: current.type,
              name: current.name,
              hasAddress: current.addresses.length > 0,
            },
            after: {
              type: updated.type,
              name: updated.name,
              hasAddress: updated.addresses.length > 0,
            },
            requestId,
          },
        });
        return updated;
      });
      return this.toResponse(supplier);
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
    }
  }
  async updateStatus(
    identity: AuthenticatedUser,
    id: string,
    isActive: boolean,
    requestId: string,
  ) {
    const current = await this.getScoped(identity.companyId, id);
    const supplier = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { id },
        data: { isActive },
        include: supplierInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId: identity.userId,
          companyId: identity.companyId,
          entity: 'Supplier',
          entityId: id,
          action: isActive ? 'supplier.activated' : 'supplier.deactivated',
          before: { isActive: current.isActive },
          after: { isActive },
          requestId,
        },
      });
      return updated;
    });
    return this.toResponse(supplier);
  }
  private async getScoped(companyId: string, id: string): Promise<SupplierWithAddress> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
      include: supplierInclude,
    });
    if (!supplier)
      throw new NotFoundException({
        code: 'SUPPLIER_NOT_FOUND',
        message: 'Fornecedor não encontrado.',
      });
    return supplier;
  }
  private validateDocument(type: SupplierType, value: string) {
    const document = digitsOnly(value);
    if (!isValidSupplierDocument(type, document))
      throw new BadRequestException({
        code: 'INVALID_SUPPLIER_DOCUMENT',
        message: type === SupplierType.INDIVIDUAL ? 'CPF inválido.' : 'CNPJ inválido.',
      });
    return document;
  }
  private optional(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value.trim() || null;
  }
  private normalizeEmail(value?: string | null) {
    const normalized = this.optional(value);
    return normalized ? normalized.toLowerCase() : normalized;
  }
  private addressData(address: SupplierAddressDto) {
    return {
      type: 'MAIN',
      postalCode: address.postalCode ? digitsOnly(address.postalCode) : null,
      street: this.optional(address.street),
      number: this.optional(address.number),
      complement: this.optional(address.complement),
      district: this.optional(address.district),
      city: this.optional(address.city),
      state: address.state?.trim().toUpperCase() || null,
      country: address.country?.trim().toUpperCase() || 'BR',
      isPrimary: true,
    };
  }
  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ConflictException({
        code: 'SUPPLIER_DOCUMENT_EXISTS',
        message: 'Documento já cadastrado nesta empresa.',
      });
    throw error;
  }
  private toResponse(supplier: SupplierWithAddress): SupplierResponseDto {
    const address = supplier.addresses[0];
    return {
      id: supplier.id,
      type: supplier.type,
      name: supplier.name,
      tradeName: supplier.tradeName,
      document: supplier.document,
      email: supplier.email,
      phone: supplier.phone,
      contactName: supplier.contactName,
      notes: supplier.notes,
      isActive: supplier.isActive,
      address: address
        ? {
            id: address.id,
            postalCode: address.postalCode ?? undefined,
            street: address.street ?? undefined,
            number: address.number ?? undefined,
            complement: address.complement ?? undefined,
            district: address.district ?? undefined,
            city: address.city ?? undefined,
            state: address.state ?? undefined,
            country: address.country,
          }
        : null,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }
}
