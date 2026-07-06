import { Controller, Get, Query } from '@nestjs/common';
import {
  CurrentTenant,
  RequirePermission,
  TenantContext,
} from '../../common/decorators';
import { Permission } from '../../common/constants/permissions';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** GET /reports/summary — aggregated store insights (console). */
  @Get('summary')
  @RequirePermission(Permission.ORDER_READ)
  summary(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ReportQueryDto,
  ) {
    return this.reports.getSummary(tenant.tenantId, query.from, query.to);
  }
}
