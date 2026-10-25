export type Product = {
  id: number;
  name: string;
  sku?: string | null;
  category?: string | null;
  purchase_price: number;
  sell_price: number;
  stock: number;
  unit: string;
  created_at: number;
};

export type Customer = {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  balance: number;
  created_at: number;
};

export type Supplier = {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  balance: number;
  created_at: number;
};

export type SaleItem = {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type Sale = {
  id: number;
  invoice_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  total: number;
  paid: number;
  discount: number;
  note?: string | null;
  created_at: number;
  items?: SaleItem[];
};

export type PurchaseItem = {
  id: number;
  purchase_id: number;
  product_id: number;
  product_name: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type Purchase = {
  id: number;
  invoice_no: string;
  supplier_id?: number | null;
  supplier_name?: string | null;
  total: number;
  paid: number;
  discount: number;
  note?: string | null;
  created_at: number;
  items?: PurchaseItem[];
};

export type Transaction = {
  id: number;
  type: 'sale' | 'purchase' | 'payment_in' | 'payment_out' | 'expense';
  party_type?: 'customer' | 'supplier' | null;
  party_id?: number | null;
  party_name?: string | null;
  amount: number;
  note?: string | null;
  created_at: number;
};

export type Expense = {
  id: number;
  category?: string | null;
  amount: number;
  note?: string | null;
  created_at: number;
};
