import api from './api';
import { ProductModule } from '../types/module';

export const moduleService = {
  getProductModules: async (productId: number, signal?: AbortSignal): Promise<ProductModule[]> => {
    const response = await api.get(`/products/${productId}/modules`, { signal });
    return response.data;
  }
};