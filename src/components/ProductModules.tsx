import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProductModule } from '../types/module';
import { moduleService } from '../services/moduleService';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProduct';
import './ProductModules.css';

const ProductModules: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);
  const [modules, setModules] = useState<ProductModule[]>([]);
  const [filteredModules, setFilteredModules] = useState<ProductModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadModules = useCallback(async (signal?: AbortSignal) => {
    if (!product) return;
    
    try {
      setLoading(true);
      const modulesData = await moduleService.getProductModules(product.productId, signal);
      if (!signal?.aborted) {
        setModules(modulesData);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        setError('Failed to load product modules');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [product]);

  const filterModulesByUserRole = useCallback(async (signal?: AbortSignal) => {
    try {
      if (!user) {
        setFilteredModules([]);
        return;
      }

      // If user is superadmin, show all modules
      if (user.isSuperadmin) {
        setFilteredModules(modules);
        return;
      }

      // Get user's role and allowed modules from backend
      const response = await fetch(`http://localhost:8080/api/admin/users/${user.id}/role-modules`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal
      });

      if (response.ok && !signal?.aborted) {
        const userRoleModules = await response.json();
        const allowedProductModuleIds = userRoleModules.map((pm: any) => pm.id);
        
        // Filter modules based on user's role permissions
        const accessible = modules.filter(productModule => 
          allowedProductModuleIds.includes(productModule.id)
        );
        setFilteredModules(accessible);
      } else if (!signal?.aborted) {
        // If no role or API error, show no modules
        setFilteredModules([]);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && !signal?.aborted) {
        setFilteredModules([]);
      }
    }
  }, [user, modules]);

  useEffect(() => {
    if (product) {
      const controller = new AbortController();
      loadModules(controller.signal);
      return () => controller.abort();
    }
  }, [product, loadModules]);

  useEffect(() => {
    if (user && modules.length > 0) {
      const controller = new AbortController();
      filterModulesByUserRole(controller.signal);
      return () => controller.abort();
    }
  }, [user, modules, filterModulesByUserRole]);

  if (loading || productLoading) {
    return (
      <div className="modules-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading modules...</p>
        </div>
      </div>
    );
  }

  if (error || productError) {
    return (
      <div className="modules-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error || productError}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            <span className="material-icons">arrow_back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modules-container">
      <div className="product-modules-page-header">
        <div className="header-top-row">
          <div className="header-left">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="back-button"
              aria-label="Back to dashboard"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <h1 className="product-modules-page-title">Product Modules</h1>
          </div>
        </div>
      </div>

      <div className="modules-grid">
        {filteredModules.map((productModule) => (
          <div 
            key={productModule.id} 
            className={`module-card ${productModule.isEnabled ? 'enabled clickable' : 'disabled'}`}
            onClick={() => {
              if (productModule.isEnabled) {
                window.scrollTo(0, 0);
                if (productModule.module.name === 'Product Basics') {
                  navigate(`/products/${productSlug}/modules/basics`);
                } else if (productModule.module.name === 'Market & Competition Analysis') {
                  navigate(`/products/${productSlug}/modules/market-competition`);
                } else if (productModule.module.name === 'Product Hypothesis') {
                  navigate(`/products/${productSlug}/modules/hypothesis`);
                } else if (productModule.module.name === 'Product Backlog') {
                  navigate(`/products/${productSlug}/modules/backlog`);
                } else if (productModule.module.name === 'Roadmap Planner') {
                  navigate(`/products/${productSlug}/modules/roadmap`);
                } else if (productModule.module.name === 'Roadmap') {
                  navigate(`/products/${productSlug}/modules/roadmap-visualization`);
                } else if (productModule.module.name === 'Capacity Planning') {
                  navigate(`/products/${productSlug}/modules/capacity-planning`);
                } else if (productModule.module.name === 'Kanban Board') {
                  navigate(`/products/${productSlug}/modules/kanban`);
                }
              }
            }}
          >
            <div className="module-icon">
              <span className="material-icons">
                {productModule.module.name === 'Product Basics' ? 'assignment' : 
                 productModule.module.name === 'Market & Competition Analysis' ? 'analytics' :
                 productModule.module.name === 'Product Hypothesis' ? 'lightbulb' :
                 productModule.module.name === 'Product Backlog' ? 'list_alt' :
                 productModule.module.name === 'Kanban Board' ? 'view_kanban' :
                 productModule.module.name === 'Roadmap Planner' ? 'timeline' :
                 productModule.module.name === 'Roadmap' ? 'view_timeline' :
                 productModule.module.name === 'Capacity Planning' ? 'groups' : 'extension'}
              </span>
            </div>
            <div className="module-content">
              <h3 className="module-name">{productModule.module.name}</h3>
              <p className="module-description">{productModule.module.description}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredModules.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">
            <span className="material-icons">assignment</span>
          </div>
          <h3>No modules available</h3>
          <p>This product doesn't have any modules configured yet.</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProductModules);