import api from './api';
import { Product, ProductRequest } from '../types/product';

// Cache and request deduplication for products
let productsCache: Product[] | null = null;
let ongoingProductsRequest: Promise<Product[]> | null = null;

export const productService = {
  async getProducts(signal?: AbortSignal): Promise<Product[]> {
    // Return cached data if available
    if (productsCache) {
      return productsCache;
    }

    // Return ongoing request if exists
    if (ongoingProductsRequest) {
      return ongoingProductsRequest;
    }

    // Create new request
    ongoingProductsRequest = (async () => {
      try {
        const response = await api.get('/products', { signal });
        productsCache = response.data;
        return response.data;
      } finally {
        ongoingProductsRequest = null;
      }
    })();

    return ongoingProductsRequest;
  },

  async createProduct(productData: ProductRequest): Promise<Product> {
    const response = await api.post('/products', productData);
    // Clear cache when creating new product
    productsCache = null;
    return response.data;
  },

  async getProduct(id: number): Promise<Product> {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Method to clear cache (useful for refreshing data)
  clearCache(): void {
    productsCache = null;
    ongoingProductsRequest = null;
  }
};