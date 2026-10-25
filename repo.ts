import { getDB, initDB, now } from './db';
import type { Product, Sale, SaleItem, Purchase, PurchaseItem } from './types';

let ready: Promise<void> | null = null;
export function ensureDB() {
  if (!ready) ready = initDB();
  return ready;
}

// ---------- Products ----------
export async function listProducts(): Promise<Product[]> {
  await ensureDB();
  const db = await getDB();
  return db.getAllAsync<Product>(`SELECT * FROM products ORDER BY name COLLATE NOCASE ASC`);
}

export async function addProduct(p: Omit<Product, 'id' | 'created_at'>): Promise<number> {
  await ensureDB();
  const db = await getDB();
  const res = await db.runAsync(
    `INSERT INTO products (name, sku, category, purchase_price, sell_price, stock, unit, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    [p.name, p.sku ?? null, p.category ?? null, p.purchase_price, p.sell_price, p.stock, p.unit, now()],
  );
  return res.lastInsertRowId as number;
}

export async function updateProduct(id: number, p: Omit<Product, 'id' | 'created_at'>): Promise<void> {
  await ensureDB();
  const db = await getDB();
  await db.runAsync(
    `UPDATE products SET name=?, sku=?, category=?, purchase_price=?, sell_price=?, stock=?, unit=? WHERE id=?`,
    [p.name, p.sku ?? null, p.category ?? null, p.purchase_price, p.sell_price, p.stock, p.unit, id],
  );
}

export async function deleteProduct(id: number): Promise<void> {
  await ensureDB();
  const db = await getDB();
  await db.runAsync(`DELETE FROM products WHERE id=?`, [id]);
}

export async function adjustStock(productId: number, delta: number): Promise<void> {
  await ensureDB();
  const db = await getDB();
  await db.runAsync(`UPDATE products SET stock = stock + ? WHERE id=?`, [delta, productId]);
}

// ---------- Customers ----------
export async function listCustomers() {
  await ensureDB();
  const db = await getDB();
  return db.getAllAsync(`SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC`);
}

export async function addCustomer(name: string, phone?: string, address?: string): Promise<number> {
  await ensureDB();
  const db = await getDB();
  const res = await db.runAsync(
    `INSERT INTO customers (name, phone, address, balance, created_at) VALUES (?,?,?,?,?)`,
    [name, phone ?? null, address ?? null, 0, now()],
  );
  return res.lastInsertRowId as number;
}

export async function deleteCustomer(id: number): Promise<void> {
  await ensureDB();
  const db = await getDB();
  await db.runAsync(`DELETE FROM customers WHERE id=?`, [id]);
}

// ---------- Suppliers ----------
export async function listSuppliers() {
  await ensureDB();
  const db = await getDB();
  return db.getAllAsync(`SELECT * FROM suppliers ORDER BY name COLLATE NOCASE ASC`);
}

export async function addSupplier(name: string, phone?: string, address?: string): Promise<number> {
  await ensureDB();
  const db = await getDB();
  const res = await db.runAsync(
    `INSERT INTO suppliers (name, phone, address, balance, created_at) VALUES (?,?,?,?,?)`,
    [name, phone ?? null, address ?? null, 0, now()],
  );
  return res.lastInsertRowId as number;
}

export async function deleteSupplier(id: number): Promise<void> {
  await ensureDB();
  const db = await getDB();
  await db.runAsync(`DELETE FROM suppliers WHERE id=?`, [id]);
}

// ---------- Sales ----------
function genInvoice(prefix: string, n: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${ymd}-${String(n).padStart(4, '0')}`;
}

export async function createSale(
  items: { product_id: number; product_name: string; qty: number; price: number }[],
  opts: { customer_id?: number; customer_name?: string; paid?: number; discount?: number; note?: string },
): Promise<number> {
  await ensureDB();
  const db = await getDB();
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const discount = opts.discount ?? 0;
  const total = Math.max(0, subtotal - discount);
  const paid = opts.paid ?? total;

  const countRow = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM sales`);
  const invoiceNo = genInvoice('INV', (countRow?.c ?? 0) + 1);

  const due = total - paid;

  await db.execAsync('BEGIN');
  try {
    const res = await db.runAsync(
      `INSERT INTO sales (invoice_no, customer_id, customer_name, total, paid, discount, note, created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [invoiceNo, opts.customer_id ?? null, opts.customer_name ?? null, total, paid, discount, opts.note ?? null, now()],
    );
    const saleId = res.lastInsertRowId as number;

    for (const it of items) {
      const sub = it.qty * it.price;
      await db.runAsync(
        `INSERT INTO sale_items (sale_id, product_id, product_name, qty, price, subtotal) VALUES (?,?,?,?,?,?)`,
        [saleId, it.product_id, it.product_name, it.qty, it.price, sub],
      );
      await db.runAsync(`UPDATE products SET stock = stock - ? WHERE id=?`, [it.qty, it.product_id]);
    }

    if (opts.customer_id && due > 0) {
      await db.runAsync(`UPDATE customers SET balance = balance + ? WHERE id=?`, [due, opts.customer_id]);
    }

    await db.runAsync(
      `INSERT INTO transactions (type, party_type, party_id, party_name, amount, note, created_at) VALUES (?,?,?,?,?,?,?)`,
      ['sale', opts.customer_id ? 'customer' : null, opts.customer_id ?? null, opts.customer_name ?? null, total, `Invoice ${invoiceNo}`, now()],
    );

    await db.execAsync('COMMIT');
    return saleId;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function listSales(limit = 200): Promise<Sale[]> {
  await ensureDB();
  const db = await getDB();
  return db.getAllAsync<Sale>(`SELECT * FROM sales ORDER BY created_at DESC LIMIT ?`, [limit]);
}

export async function getSaleItems(saleId: number): Promise<SaleItem[]> {
  await ensureDB();
  const db = await getDB();
  return db.getAllAsync<SaleItem>(`SELECT * FROM sale_items WHERE sale_id=?`, [saleId]);
}

export async function deleteSale(id: number): Promise<void> {
  await ensureDB();
  const db = await getDB();
  const items = await getSaleItems(id);
  await db.execAsync('BEGIN');
  try {
    for (const it of items) {
      await db.runAsync(`UPDATE products SET stock = stock + ? WHERE id=?`, [it.qty, it.product_id]);
    }
    await db.runAsync(`DELETE FROM sale_items WHERE sale_id=?`, [id]);
    await db.runAsync(`DELETE FROM sales WHERE id=?`, [id]);
    await db.runAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

// ---------- Purchases ----------
export async function createPurchase(
  items: { product_id: number; product_name: string; qty: number; price: number }[],
  opts: { supplier_id?: number; supplier_name?: string; paid?: number; discount?: number; note?: string },
): Promise<number> {
  await ensureDB();
  const db = await getDB();
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const discount = opts.discount ?? 0;
  const total = Math.max(0, subtotal - discount);
  const paid = opts.paid ?? total;
  const due = total - paid;

  const countRow = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM purchases`);
  const invoiceNo = genInvoice('PUR', (countRow?.c ?? 0) + 1);

  await db.execAsync('BEGIN');
  try {
    const res = await db.runAsync(
      `INSERT INTO purchases (invoice_no, supplier_id, supplier_name, total, paid, discount, note, created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [invoiceNo, opts.supplier_id ?? null, opts.supplier_name ?? null, total, paid, discount, opts.note ?? null, now()],
    );
    const purchaseId = res.lastInsertRowId as number;

    for (const it of items) {
      const sub = it.qty * it.price;
      await db.runAsync(
        `INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, price, subtotal) VALUES (?,?,?,?,?,?)`,
        [purchaseId, it.product_id, it.product_name, it.qty, it.price, sub],
      );
      await db.runAsync(`UPDATE products SET stock = stock + ? WHERE id=?`, [it.qty, it.product_id]);
    }

    if (opts.supplier_id && due > 0) {
      await db.runAsync(`UPDATE suppliers SET balance = balance + ? WHERE id=?`, [due, opts.supplier_id]);
    }

    await db.runAsync(
      `INSERT INTO transactions (type, party_type, party_id, party_name, amount, note, created_at) VALUES (?,?,?,?,?,?,?)`,
      ['purchase', opts.supplier_id ? 'supplier' : null, opts.supplier_id ?? null, opts.supplier_name ?? null, total, `Invoice ${invoiceNo}`, now()],
    );

    await db.execAsync('COMMIT');
    return purchaseId;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function deletePurchase(id: number): Promise<void> {
  await ensureDB();
  const db = await getDB();
  const items = await getPurchaseItems(id);
  await db.execAsync('BEGIN');
  try {
    for (const it of items) {
      await db.runAsync(`UPDATE products SET stock = stock - ? WHERE id=?`, [it.qty, it.product_id]);
    }
    await db.runAsync(`DELETE FROM purchase_items WHERE purchase_id=?`, [id]);
    await db.runAsync(`DELETE FROM purchases WHERE id=?`, [id]);
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function listPurchases(limit = 200): Promise<Purchase[]> {
  await ensureDB();
  const db = await getDB();
  return db.getAllAsync<Purchase>(`SELECT * FROM purchases ORDER BY created_at DESC LIMIT ?`, [limit]);
}

export async function getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]> {
  await ensureDB();
  const db = await getDB();
  return db.getAllAsync<PurchaseItem>(`SELECT * FROM purchase_items WHERE purchase_id=?`, [purchaseId]);
}

// ---------- Expenses ----------
export async function addExpense(amount: number, category?: string, note?: string): Promise<number> {
  await ensureDB();
  const db = await getDB();
  const res = await db.runAsync(
    `INSERT INTO expenses (category, amount, note, created_at) VALUES (?,?,?,?)`,
    [category ?? null, amount, note ?? null, now()],
  );
  await db.runAsync(
    `INSERT INTO transactions (type, amount, note, created_at) VALUES (?,?,?,?)`,
    ['expense', amount, note ?? category ?? 'Expense', now()],
  );
  return res.lastInsertRowId as number;
}

export async function listExpenses(limit = 200) {
  await ensureDB();
  const db = await getDB();
  return db.getAllAsync(`SELECT * FROM expenses ORDER BY created_at DESC LIMIT ?`, [limit]);
}

// ---------- Dashboard ----------
export async function dashboardStats() {
  await ensureDB();
  const db = await getDB();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tsStart = todayStart.getTime();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const msStart = monthStart.getTime();

  const totalSales = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(total),0) AS v FROM sales`);
  const todaySales = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(total),0) AS v FROM sales WHERE created_at >= ?`, [tsStart]);
  const monthSales = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(total),0) AS v FROM sales WHERE created_at >= ?`, [msStart]);

  const totalPurchases = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(total),0) AS v FROM purchases`);
  const todayPurchases = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(total),0) AS v FROM purchases WHERE created_at >= ?`, [tsStart]);

  const totalExpenses = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(amount),0) AS v FROM expenses`);
  const monthExpenses = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(amount),0) AS v FROM expenses WHERE created_at >= ?`, [msStart]);

  const receivable = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(balance),0) AS v FROM customers WHERE balance > 0`);
  const payable = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(balance),0) AS v FROM suppliers WHERE balance > 0`);

  const stockValueRow = await db.getFirstAsync<{ v: number }>(`SELECT COALESCE(SUM(stock * purchase_price),0) AS v FROM products`);
  const lowStock = await db.getAllAsync<{ id: number; name: string; stock: number; unit: string }>(
    `SELECT id, name, stock, unit FROM products WHERE stock <= 5 ORDER BY stock ASC LIMIT 10`,
  );

  const recentSales = await db.getAllAsync<{ id: number; invoice_no: string; customer_name: string; total: number; created_at: number }>(
    `SELECT id, invoice_no, customer_name, total, created_at FROM sales ORDER BY created_at DESC LIMIT 5`,
  );

  return {
    totalSales: totalSales?.v ?? 0,
    todaySales: todaySales?.v ?? 0,
    monthSales: monthSales?.v ?? 0,
    totalPurchases: totalPurchases?.v ?? 0,
    todayPurchases: todayPurchases?.v ?? 0,
    totalExpenses: totalExpenses?.v ?? 0,
    monthExpenses: monthExpenses?.v ?? 0,
    receivable: receivable?.v ?? 0,
    payable: payable?.v ?? 0,
    stockValue: stockValueRow?.v ?? 0,
    lowStock,
    recentSales,
    profit: (totalSales?.v ?? 0) - (totalPurchases?.v ?? 0) - (totalExpenses?.v ?? 0),
    monthProfit: (monthSales?.v ?? 0) - (totalPurchases?.v ?? 0) - (monthExpenses?.v ?? 0),
  };
}
