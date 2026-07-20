/** Console-facing customer record. */
export interface CustomerView {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: Date;
}
