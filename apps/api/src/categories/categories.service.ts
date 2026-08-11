import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryResponseDto, CreateCategoryDto, ListCategoriesQueryDto, CategoryStatusFilter, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(identity: AuthenticatedUser, query: ListCategoriesQueryDto) {
    const where: Prisma.CategoryWhereInput = { companyId: identity.companyId, ...(query.status ? { isActive: query.status === CategoryStatusFilter.ACTIVE } : {}), ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {}) };
    const [categories, total] = await this.prisma.$transaction([this.prisma.category.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { [query.sortBy]: query.sortOrder } }), this.prisma.category.count({ where })]);
    return { data: categories.map((category) => this.toResponse(category)), meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }
  async create(identity: AuthenticatedUser, dto: CreateCategoryDto, requestId: string): Promise<CategoryResponseDto> {
    const name = dto.name.trim();
    try { const category = await this.prisma.$transaction(async (tx) => { const created = await tx.category.create({ data: { companyId: identity.companyId, name, normalizedName: this.normalize(name), description: dto.description?.trim() } }); await tx.auditLog.create({ data: { actorId: identity.userId, companyId: identity.companyId, entity: 'Category', entityId: created.id, action: 'category.created', after: { name: created.name }, requestId } }); return created; }); return this.toResponse(category); } catch (error: unknown) { this.rethrowDuplicate(error); }
  }
  async findOne(identity: AuthenticatedUser, id: string) { return this.toResponse(await this.getScoped(identity.companyId, id)); }
  async update(identity: AuthenticatedUser, id: string, dto: UpdateCategoryDto, requestId: string) {
    const current = await this.getScoped(identity.companyId, id);
    try { const category = await this.prisma.$transaction(async (tx) => { const updated = await tx.category.update({ where: { id }, data: { ...(dto.name !== undefined ? { name: dto.name.trim(), normalizedName: this.normalize(dto.name) } : {}), ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}) } }); await tx.auditLog.create({ data: { actorId: identity.userId, companyId: identity.companyId, entity: 'Category', entityId: id, action: 'category.updated', before: { name: current.name, description: current.description }, after: { name: updated.name, description: updated.description }, requestId } }); return updated; }); return this.toResponse(category); } catch (error: unknown) { this.rethrowDuplicate(error); }
  }
  async updateStatus(identity: AuthenticatedUser, id: string, isActive: boolean, requestId: string) {
    const current = await this.getScoped(identity.companyId, id);
    const category = await this.prisma.$transaction(async (tx) => { const updated = await tx.category.update({ where: { id }, data: { isActive } }); await tx.auditLog.create({ data: { actorId: identity.userId, companyId: identity.companyId, entity: 'Category', entityId: id, action: isActive ? 'category.activated' : 'category.deactivated', before: { isActive: current.isActive }, after: { isActive }, requestId } }); return updated; }); return this.toResponse(category);
  }
  private async getScoped(companyId: string, id: string) { const category = await this.prisma.category.findFirst({ where: { id, companyId } }); if (!category) throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Categoria não encontrada.' }); return category; }
  private normalize(value: string) { return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR'); }
  private rethrowDuplicate(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ code: 'CATEGORY_NAME_EXISTS', message: 'Nome de categoria já utilizado.' }); throw error; }
  private toResponse(category: { id: string; name: string; description: string | null; isActive: boolean; createdAt: Date; updatedAt: Date }): CategoryResponseDto { return { id: category.id, name: category.name, description: category.description, isActive: category.isActive, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString() }; }
}
