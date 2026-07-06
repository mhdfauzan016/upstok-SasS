import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  Public,
  RequirePermission,
  TenantContext,
} from '../../common/decorators';
import { Permission } from '../../common/constants/permissions';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** POST /orders — guest checkout (tenant-scoped via X-Tenant-Slug). */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.create(tenant.tenantId, dto);
  }

  /** GET /orders — console list. */
  @Get()
  @RequirePermission(Permission.ORDER_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.orders.list(tenant.tenantId, query);
  }

  /** GET /orders/:id — console detail. */
  @Get(':id')
  @RequirePermission(Permission.ORDER_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.orders.getById(tenant.tenantId, id);
  }

  /** PATCH /orders/:id/status — advance lifecycle. */
  @Patch(':id/status')
  @RequirePermission(Permission.ORDER_WRITE)
  updateStatus(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(tenant.tenantId, id, dto, actor);
  }
}
