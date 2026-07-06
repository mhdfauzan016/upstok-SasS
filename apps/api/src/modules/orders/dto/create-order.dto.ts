import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class OrderCustomerDto {
  @IsString()
  @Length(2, 150)
  name!: string;

  @IsString()
  @Length(5, 30)
  phone!: string;

  @IsString()
  @Length(5, 500)
  address!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

class OrderItemInputDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;
}

/** POST /orders — guest/customer checkout. Prices are recomputed server-side. */
export class CreateOrderDto {
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer!: OrderCustomerDto;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}
