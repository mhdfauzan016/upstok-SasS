import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/constants/reserved-slugs';

class CreateTenantOwnerDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsEmail()
  @Length(3, 255)
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}

/**
 * POST /tenants — public self-signup.
 * Creates the tenant, its founding TENANT_OWNER user, and a subscription to `planCode`.
 */
export class CreateTenantDto {
  @IsString()
  @Length(2, 100)
  storeName!: string;

  @IsString()
  @Length(3, 40)
  @Matches(SLUG_PATTERN, {
    message:
      'slug must be 3–40 chars, lowercase letters/digits/hyphens, no leading or trailing hyphen',
  })
  slug!: string;

  @ValidateNested()
  @Type(() => CreateTenantOwnerDto)
  @IsNotEmpty()
  owner!: CreateTenantOwnerDto;

  @IsString()
  @MinLength(1)
  planCode!: string;
}
