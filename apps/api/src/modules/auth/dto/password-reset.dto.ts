import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { AuthScopeInput } from './login.dto';

/** POST /auth/password/reset-request — always returns 202 (no account enumeration). */
export class PasswordResetRequestDto {
  @IsEmail()
  @Length(3, 255)
  email!: string;

  @IsEnum(AuthScopeInput)
  scope!: AuthScopeInput;
}

/** POST /auth/password/reset — consumes a single-use reset token. */
export class PasswordResetDto {
  @IsString()
  @Length(16, 512)
  token!: string;

  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
