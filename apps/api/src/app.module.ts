import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { StockLocationsModule } from './stock-locations/stock-locations.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InventoryModule } from './inventory/inventory.module';
import { InventoryCountsModule } from './inventory-counts/inventory-counts.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseReceiptsModule } from './purchase-receipts/purchase-receipts.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { StockReservationsModule } from './stock-reservations/stock-reservations.module';
import { FinanceModule } from './finance/finance.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { validateEnvironment } from './config/environment';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { ErpThrottlerGuard } from './security/erp-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
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
    WarehousesModule,
    StockLocationsModule,
    InventoryCountsModule,
    InventoryModule,
    PurchaseOrdersModule,
    PurchaseReceiptsModule,
    SalesOrdersModule,
    StockReservationsModule,
    FinanceModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ErpThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
