import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantResolverMiddleware } from './common/middleware/tenant-resolver.middleware';
import { PrismaModule } from './core/prisma/prisma.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    PrismaModule, // global
    SharedModule, // global: AuditService, TenantCacheService
    AuthModule, // global: TokenService + APP_GUARD chain
    TenantsModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    InventoryModule,
    OrdersModule,
    ReportsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Resolve tenant context before the guard chain runs, for every route.
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
