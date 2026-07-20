import { IsEmail, IsString, Length, Matches } from 'class-validator';

/**
 * POST /auth/register — public customer self-registration.
 * Requires X-Tenant-Slug; creates a `pending` account awaiting admin approval.
 */
export class RegisterDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsEmail()
  @Length(3, 255)
  email!: string;

  @IsString()
  @Matches(/^[0-9+()\-\s]{6,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
