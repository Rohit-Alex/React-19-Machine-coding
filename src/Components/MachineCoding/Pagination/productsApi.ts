export interface Product {
  id: number;
  name: string;
  price: number;
}

export const PRODUCTS: Product[] = Array.from({ length: 95 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: ((i * 37) % 90) + 10,
}));

export interface ProductPage {
  items: Product[];
  total: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A fake server endpoint: GET /products?page=2&pageSize=10
export async function fetchProducts(
  page: number,
  pageSize: number,
): Promise<ProductPage> {
  await delay(500);
  const start = (page - 1) * pageSize;
  return {
    items: PRODUCTS.slice(start, start + pageSize),
    total: PRODUCTS.length,
  };
}
