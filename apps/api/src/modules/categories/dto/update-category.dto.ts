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

/** PATCH /categories/:id — partial update (tenant console). */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  @Matches(SLUG_PATTERN, {
    message: 'slug must be lowercase letters/digits/hyphens',
  })
  slug?: string;

  // `null` detaches the category from its parent (moves it to root).
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
