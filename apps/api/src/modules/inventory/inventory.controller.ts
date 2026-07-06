import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentTenant,
  CurrentUser,
  RequirePermission,
  TenantContext,
} from '../../common/decorators';
import { Permission } from '../../common/constants/permissions';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** GET /inventory — console stock list. */
  @Get()
  @RequirePermission(Permission.INVENTORY_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListInventoryQueryDto,
  ) {
    return this.inventory.list(tenant.tenantId, query);
  }

  /** GET /inventory/alerts/low-stock — low-stock alerts. */
  @Get('alerts/low-stock')
  @RequirePermission(Permission.INVENTORY_READ)
  lowStock(@CurrentTenant() tenant: TenantContext) {
    return this.inventory.listLowStock(tenant.tenantId);
  }

  /** GET /inventory/:productId — single product's stock. */
  @Get(':productId')
  @RequirePermission(Permission.INVENTORY_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ) {
    return this.inventory.getByProductId(tenant.tenantId, productId);
  }

  /** GET /inventory/:productId/movements — the ledger. */
  @Get(':productId/movements')
  @RequirePermission(Permission.INVENTORY_READ)
  movements(
    @CurrentTenant() tenant: TenantContext,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Query() query: ListInventoryQueryDto,
  ) {
    return this.inventory.listMovements(
      tenant.tenantId,
      productId,
      query.page,
      query.limit,
    );
  }

  /** POST /inventory/:productId/adjust — apply a signed stock delta. */
  @Post(':productId/adjust')
  @RequirePermission(Permission.INVENTORY_WRITE)
  adjust(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventory.adjust(tenant.tenantId, productId, dto, actor);
  }

  /** PATCH /inventory/:productId — update the low-stock threshold. */
  @Patch(':productId')
  @RequirePermission(Permission.INVENTORY_WRITE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventory.updateSettings(tenant.tenantId, productId, dto, actor);
  }
}
