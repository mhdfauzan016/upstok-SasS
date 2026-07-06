import { Transform, Type } from 'class-transformer';
import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

/** GET /inventory — console stock list / filter. */
export class ListInventoryQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Transform(({ value }) => (value as string)?.trim())
  search?: string;

  /** When "true", returns only items at or below their low-stock threshold. */
  @IsOptional()
  @IsBooleanString()
  lowStock?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit = 20;
}
