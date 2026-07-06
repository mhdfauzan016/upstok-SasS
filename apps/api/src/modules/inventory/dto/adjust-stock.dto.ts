import { IsEnum, IsInt, IsOptional, IsString, Length } from 'class-validator';

/** Movement kinds a console operator may record manually. */
export enum AdjustmentType {
  RESTOCK = 'restock',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
}

/** POST /inventory/:productId/adjust — apply a signed stock delta. */
export class AdjustStockDto {
  /**
   * Signed quantity change. Positive adds stock, negative removes it.
   * Must be non-zero; the service rejects a delta that would drive
   * quantityOnHand below 0.
   */
  @IsInt()
  quantityChange!: number;

  @IsOptional()
  @IsEnum(AdjustmentType)
  type?: AdjustmentType;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}
