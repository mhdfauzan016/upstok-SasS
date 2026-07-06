export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  stock: number;
  description: string;
  sizes: string[];
  colors: string[];
  images: string[];
  bestSeller?: boolean;
  featured?: boolean;
};

export type CartItem = {
  productId: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  size?: string;
  color?: string;
};

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Completed";

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: {
    name: string;
    phone: string;
    address: string;
    notes?: string;
  };
  items: CartItem[];
  total: number;
};

export type InventoryLog = {
  id: string;
  productId: string;
  productName: string;
  type: "IN" | "OUT";
  qty: number;
  note: string;
  createdAt: string;
};
