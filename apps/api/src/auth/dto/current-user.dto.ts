import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserCompanyDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class CurrentUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: CurrentUserCompanyDto })
  company!: CurrentUserCompanyDto;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: [String], example: ['Administrator'] })
  roles!: string[];

  @ApiProperty({ type: [String], example: ['users.read', 'roles.read'] })
  permissions!: string[];
}
