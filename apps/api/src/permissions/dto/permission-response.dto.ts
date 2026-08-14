import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionCatalogItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'users.read' })
  code!: string;

  @ApiProperty({ example: 'users' })
  resource!: string;

  @ApiProperty({ example: 'read' })
  action!: string;

  @ApiPropertyOptional()
  description!: string | null;
}
