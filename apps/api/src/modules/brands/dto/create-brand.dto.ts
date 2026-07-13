import { IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { SLUG_PATTERN } from '../../../common/constants/reserved-slugs';

/** POST /brands — create (tenant console). */
export class CreateBrandDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  @Matches(SLUG_PATTERN, {
    message: 'slug must be lowercase letters/digits/hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
