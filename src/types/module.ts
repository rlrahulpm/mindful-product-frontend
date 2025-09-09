export interface Module {
  moduleId: number;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface ProductModule {
  id: number;
  productId: number;
  module: Module;
  isEnabled: boolean;
  completionPercentage: number;
  createdAt: string;
}