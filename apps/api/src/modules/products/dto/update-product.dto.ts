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
  Min,
  ValidateNested,
} from 'class-validator';

export enum ProductStatusUpdate {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

class MoneyDto {
  @IsInt()
  @Min(0)
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;
}

/** PATCH /products/:id — partial update (tenant console). */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  price?: MoneyDto;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  brandId?: string | null;

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
  @IsEnum(ProductStatusUpdate)
  status?: ProductStatusUpdate;
}
