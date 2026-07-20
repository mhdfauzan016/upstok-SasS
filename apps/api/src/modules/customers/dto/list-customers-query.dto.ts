import { IsEnum, IsOptional } from 'class-validator';

export enum CustomerStatusFilter {
  PENDING = 'pending',
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/** GET /customers — console list, optional status filter. */
export class ListCustomersQueryDto {
  @IsOptional()
  @IsEnum(CustomerStatusFilter)
  status?: CustomerStatusFilter;
}
