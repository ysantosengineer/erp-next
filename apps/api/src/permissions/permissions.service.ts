import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionCatalogItemDto } from './dto/permission-response.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PermissionCatalogItemDto[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      select: {
        id: true,
        resource: true,
        action: true,
        description: true,
      },
    });

    return permissions.map((permission) => ({
      ...permission,
      code: `${permission.resource}.${permission.action}`,
    }));
  }
}
