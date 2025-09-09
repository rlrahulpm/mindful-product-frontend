export interface Product {
  productId: number;
  productName: string;
  createdAt: string;
  slug?: string;
}

export interface ProductRequest {
  productName: string;
}