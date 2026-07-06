import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

/** Tenant lifecycle states a platform admin may set. */
export enum TenantStatusAction {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

/** PATCH /platform/tenants/:tenantId/status — platform admin. */
export class UpdateTenantStatusDto {
  @IsEnum(TenantStatusAction)
  status!: TenantStatusAction;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}
