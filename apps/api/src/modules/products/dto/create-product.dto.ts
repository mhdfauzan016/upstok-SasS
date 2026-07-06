import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/constants/reserved-slugs';

export enum ProductStatusInput {
  DRAFT = 'draft',
  ACTIVE = 'active',
}

class MoneyDto {
  @IsInt()
  @Min(0)
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;
}

/** POST /products — create (tenant console). */
export class CreateProductDto {
  @IsString()
  @Length(2, 150)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(3, 60)
  @Matches(SLUG_PATTERN, {
    message: 'slug must be lowercase letters/digits/hyphens',
  })
  slug?: string;

  @IsString()
  @Length(1, 64)
  sku!: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  price!: MoneyDto;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  // require_tld:false so locally-hosted uploads (e.g. http://localhost:3001/...)
  // are accepted; production hosts (api.lvh.me / *.upstock.my.id) pass either way.
  @IsUrl({ require_protocol: true, require_tld: false }, { each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  colors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 40, { each: true })
  sizes?: string[];

  @IsOptional()
  @IsEnum(ProductStatusInput)
  status?: ProductStatusInput;
}
