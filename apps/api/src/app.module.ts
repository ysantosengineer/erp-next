import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { UnitsModule } from './units/units.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    PermissionsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CategoriesModule,
    CustomersModule,
    UnitsModule,
    SuppliersModule,
    ProductsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
