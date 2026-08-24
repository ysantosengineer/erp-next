import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerType, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { digitsOnly, isValidCustomerDocument } from './customer-document.util';
import {
  CreateCustomerDto,
  CustomerAddressDto,
  CustomerResponseDto,
  CustomerStatusFilter,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

const customerInclude = {
  addresses: { where: { isPrimary: true }, take: 1 },
} satisfies Prisma.CustomerInclude;

type CustomerWithAddress = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(identity: AuthenticatedUser, query: ListCustomersQueryDto) {
    const searchDocument = query.search ? digitsOnly(query.search) : '';
    const where: Prisma.CustomerWhereInput = {
      companyId: identity.companyId,
      ...(query.status ? { isActive: query.status === CustomerStatusFilter.ACTIVE } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { tradeName: { contains: query.search, mode: 'insensitive' } },
              { document: { contains: searchDocument || query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: searchDocument || query.search } },
            ],
          }
        : {}),
    };
    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: customerInclude,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return {
      data: customers.map((customer) => this.toResponse(customer)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(identity: AuthenticatedUser, dto: CreateCustomerDto, requestId: string) {
    const document = this.validateDocument(dto.type, dto.document);
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
          data: {
            companyId: identity.companyId,
            type: dto.type,
            name: dto.name.trim(),
            tradeName: this.optional(dto.tradeName),
            document,
            email: this.normalizeEmail(dto.email),
            phone: dto.phone ? digitsOnly(dto.phone) : null,
            creditLimit: new Prisma.Decimal(dto.creditLimit ?? '0'),
            notes: this.optional(dto.notes),
            ...(dto.address ? { addresses: { create: this.addressData(dto.address) } } : {}),
          },
          include: customerInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Customer',
            entityId: created.id,
            action: 'customer.created',
            after: this.auditSnapshot(created),
            requestId,
          },
        });
        return created;
      });
      return this.toResponse(customer);
    } catch (error: unknown) {
      this.rethrowDuplicate(error);
    }
  }

  async findOne(identity: AuthenticatedUser, id: string) {
    return this.toResponse(await this.getScoped(identity.companyId, id));
  }

  async update(identity: AuthenticatedUser, id: string, dto: UpdateCustomerDto, requestId: string) {
    this.rejectNullRequiredValues(dto);
    const current = await this.getScoped(identity.companyId, id);
    const type = dto.type ?? current.type;
    const document =
      dto.document !== undefined || dto.type !== undefined
        ? this.validateDocument(type, dto.document ?? current.document)
        : undefined;
    try {
      const customer = await this.prisma.$transaction(async (tx) => {
        if (dto.address !== undefined) {
          await tx.customerAddress.deleteMany({ where: { customerId: id, isPrimary: true } });
        }
        const updated = await tx.customer.update({
          where: { id },
          data: {
            ...(dto.type !== undefined ? { type: dto.type } : {}),
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.tradeName !== undefined ? { tradeName: this.optional(dto.tradeName) } : {}),
            ...(document !== undefined ? { document } : {}),
            ...(dto.email !== undefined ? { email: this.normalizeEmail(dto.email) } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone ? digitsOnly(dto.phone) : null } : {}),
            ...(dto.creditLimit !== undefined
              ? { creditLimit: new Prisma.Decimal(dto.creditLimit) }
              : {}),
            ...(dto.notes !== undefined ? { notes: this.optional(dto.notes) } : {}),
            ...(dto.address ? { addresses: { create: this.addressData(dto.address) } } : {}),
          },
          include: customerInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId: identity.userId,
            companyId: identity.companyId,
            entity: 'Customer',
            entityId: id,
            action: 'customer.updated',
            before: this.auditSnapshot(current),
            after: this.auditSnapshot(updated),
            requestId,
          },
        });
        return updated;
      });
      return this.toResponse(customer);
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
    const customer = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: { isActive },
        include: customerInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId: identity.userId,
          companyId: identity.companyId,
          entity: 'Customer',
          entityId: id,
          action: isActive ? 'customer.activated' : 'customer.deactivated',
          before: { isActive: current.isActive },
          after: { isActive },
          requestId,
        },
      });
      return updated;
    });
    return this.toResponse(customer);
  }

  private async getScoped(companyId: string, id: string): Promise<CustomerWithAddress> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      include: customerInclude,
    });
    if (!customer) {
      throw new NotFoundException({
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Cliente não encontrado.',
      });
    }
    return customer;
  }

  private rejectNullRequiredValues(dto: UpdateCustomerDto) {
    if (
      dto.type === null ||
      dto.name === null ||
      dto.document === null ||
      dto.creditLimit === null
    ) {
      throw new BadRequestException({
        code: 'INVALID_CUSTOMER_DATA',
        message: 'Tipo, nome, documento e limite de crédito não aceitam valor nulo.',
      });
    }
  }

  private validateDocument(type: CustomerType, value: string) {
    const document = digitsOnly(value);
    if (!isValidCustomerDocument(type, document)) {
      throw new BadRequestException({
        code: 'INVALID_CUSTOMER_DOCUMENT',
        message: type === CustomerType.INDIVIDUAL ? 'CPF inválido.' : 'CNPJ inválido.',
      });
    }
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

  private addressData(address: CustomerAddressDto) {
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

  private auditSnapshot(customer: CustomerWithAddress) {
    return {
      type: customer.type,
      name: customer.name,
      tradeName: customer.tradeName,
      creditLimit: customer.creditLimit.toFixed(2),
      isActive: customer.isActive,
      hasAddress: customer.addresses.length > 0,
    };
  }

  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException({
        code: 'CUSTOMER_DOCUMENT_EXISTS',
        message: 'Documento já cadastrado nesta empresa.',
      });
    }
    throw error;
  }

  private toResponse(customer: CustomerWithAddress): CustomerResponseDto {
    const address = customer.addresses[0];
    return {
      id: customer.id,
      type: customer.type,
      name: customer.name,
      tradeName: customer.tradeName,
      document: customer.document,
      email: customer.email,
      phone: customer.phone,
      creditLimit: customer.creditLimit.toFixed(2),
      notes: customer.notes,
      isActive: customer.isActive,
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
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
