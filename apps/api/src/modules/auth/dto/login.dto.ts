import { IsEmail, IsEnum, IsString, Length } from 'class-validator';

export enum AuthScopeInput {
  PLATFORM = 'platform',
  TENANT = 'tenant',
  CUSTOMER = 'customer',
}

/** POST /auth/login — tenant/customer scopes require X-Tenant-Slug. */
export class LoginDto {
  @IsEmail()
  @Length(3, 255)
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsEnum(AuthScopeInput)
  scope!: AuthScopeInput;
}
