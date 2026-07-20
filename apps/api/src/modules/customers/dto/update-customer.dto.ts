import { IsEnum } from 'class-validator';

export enum CustomerStatusUpdate {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/**
 * PATCH /customers/:id — set a customer's status. Admin approves a `pending`
 * signup by setting `active`, or blocks access with `disabled`.
 */
export class UpdateCustomerDto {
  @IsEnum(CustomerStatusUpdate)
  status!: CustomerStatusUpdate;
}
