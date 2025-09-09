export interface Product {
  productId: number;
  productName: string;
  createdAt: string;
}

export interface ProductModuleResponse {
  id: number;
  product: Product;
  module: Module;
  isEnabled: boolean;
  completionPercentage: number;
  createdAt: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  productModules: ProductModuleResponse[];
  createdAt: string;
}

export interface Module {
  moduleId: number;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  isSuperadmin: boolean;
  role?: Role;
  createdAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  productModuleIds?: number[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  productModuleIds?: number[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  roleId?: number;
}

export interface UpdateUserRequest {
  roleId?: number;
}