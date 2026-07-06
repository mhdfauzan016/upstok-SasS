/** Response shapes for the Orders module. */

export interface Money {
  amount: number;
  currency: string;
}

export interface OrderItemView {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface OrderCustomerView {
  name: string;
  phone: string;
  address: string;
  notes: string | null;
}

/** Console order list row (no items). */
export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  customer: OrderCustomerView;
  subtotal: Money;
  total: Money;
  itemCount: number;
  createdAt: Date;
}

/** Full order with line items. */
export interface OrderDetail extends OrderListItem {
  items: OrderItemView[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}
