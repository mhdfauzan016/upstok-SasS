/** Response shapes for the Inventory module. */

/** Console-facing inventory row for a single product. */
export interface InventoryItemView {
  productId: string;
  productName: string;
  sku: string;
  quantityOnHand: number;
  reservedQuantity: number;
  /** quantityOnHand - reservedQuantity (never below 0). */
  quantityAvailable: number;
  lowStockThreshold: number;
  lowStock: boolean;
  updatedAt: Date;
}

/** A single entry in the stock-movement ledger. */
export interface StockMovementView {
  id: string;
  type: string;
  quantityChange: number;
  quantityAfter: number;
  note: string | null;
  actorId: string | null;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}
