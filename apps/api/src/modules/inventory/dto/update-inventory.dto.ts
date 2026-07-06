import { IsInt, Min } from 'class-validator';

/** PATCH /inventory/:productId — update inventory settings (not the count). */
export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  lowStockThreshold!: number;
}
