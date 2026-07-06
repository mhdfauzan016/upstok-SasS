import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/constants/reserved-slugs';

/** POST /categories — create (tenant console). */
export class CreateCategoryDto {
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
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
