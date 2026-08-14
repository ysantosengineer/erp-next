import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
