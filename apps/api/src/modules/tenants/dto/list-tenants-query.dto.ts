import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { TenantStatusAction } from './update-tenant-status.dto';

/** GET /platform/tenants — list/filter query (platform admin). */
export class ListTenantsQueryDto {
  @IsOptional()
  @IsEnum(TenantStatusAction)
  status?: TenantStatusAction;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (value as string)?.trim())
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
