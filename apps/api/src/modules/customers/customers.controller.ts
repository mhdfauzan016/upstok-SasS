import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CustomersService } from './customers.service';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  /** GET /customers — console list (approve queue). */
  @Get()
  @RequirePermission(Permission.CUSTOMER_MANAGE)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.customers.list(tenant.tenantId, query.status);
  }

  /** PATCH /customers/:id — approve or disable. */
  @Patch(':id')
  @RequirePermission(Permission.CUSTOMER_MANAGE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.setStatus(tenant.tenantId, id, dto.status, actor);
  }
}
