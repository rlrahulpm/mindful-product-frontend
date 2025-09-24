import api from './api';
import { Role, User, Module, ProductModuleResponse, CreateRoleRequest, UpdateRoleRequest, CreateUserRequest, CreateUserWithoutPasswordRequest, CreateUserWithTokenResponse, GenerateResetTokenResponse, UpdateUserRequest } from '../types/admin';

export const adminService = {
  // Role management
  getRoles: async (): Promise<Role[]> => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  createRole: async (roleData: CreateRoleRequest): Promise<Role> => {
    const response = await api.post('/admin/roles', roleData);
    return response.data;
  },

  updateRole: async (roleId: number, roleData: UpdateRoleRequest): Promise<Role> => {
    const response = await api.put(`/admin/roles/${roleId}`, roleData);
    return response.data;
  },

  deleteRole: async (roleId: number): Promise<void> => {
    await api.delete(`/admin/roles/${roleId}`);
  },

  // User management
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  createUser: async (userData: CreateUserWithoutPasswordRequest): Promise<CreateUserWithTokenResponse> => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  generatePasswordResetLink: async (userId: number): Promise<GenerateResetTokenResponse> => {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  },

  updateUser: async (userId: number, userData: UpdateUserRequest): Promise<User> => {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
  },

  // Module management
  getModules: async (): Promise<Module[]> => {
    const response = await api.get('/admin/modules');
    return response.data;
  },

  // Product Module management
  getProductModules: async (): Promise<ProductModuleResponse[]> => {
    const response = await api.get('/admin/product-modules');
    return response.data;
  },

  // Product management
  getAllProducts: async (): Promise<any[]> => {
    const response = await api.get('/products');
    return response.data;
  }
};