import { IsEnum } from 'class-validator';
import { OrderStatusFilter } from './list-orders-query.dto';

/** PATCH /orders/:id/status — advance an order's lifecycle. */
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatusFilter)
  status!: OrderStatusFilter;
}
