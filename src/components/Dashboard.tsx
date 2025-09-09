import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productService } from '../services/productService';
import { Product } from '../types/product';
import { toSlug } from '../utils/productUtils';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAddForm) {
        setShowAddForm(false);
      }
    };

    if (showAddForm) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
      // Force CSS reflow to ensure styles are applied
      requestAnimationFrame(() => {
        const modalOverlay = document.querySelector('.modal-overlay') as HTMLElement;
        if (modalOverlay) {
          void modalOverlay.offsetHeight; // Force reflow
        }
      });
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showAddForm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productService.getProducts();
      setProducts(productsData);
    } catch (err: any) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;

    try {
      setIsAddingProduct(true);
      const newProduct = await productService.createProduct({ productName: newProductName });
      setProducts([...products, newProduct]);
      setNewProductName('');
      setShowAddForm(false); // Hide form after successful addition
    } catch (err: any) {
      setError('Failed to add product');
    } finally {
      setIsAddingProduct(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Product Dashboard</h1>
          <p className="dashboard-subtitle">Manage your product inventory</p>
        </div>
        {user?.isSuperadmin && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary add-product-btn"
          >
            Add Product
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Product</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddProduct} className="modal-form">
                <div className="form-group">
                  <label htmlFor="productName" className="form-label">Product Name</label>
                  <input
                    type="text"
                    id="productName"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Enter product name"
                    required
                    className="form-control"
                  />
                </div>
              </form>
            </div>
            <div className="modal-actions">
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleAddProduct}
                disabled={isAddingProduct}
                className="btn btn-primary"
              >
                {isAddingProduct ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="products-section">
        <h3 className="section-title">Your Products</h3>
        {error && <div className="alert alert-error">{error}</div>}
        
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <h4>No products yet</h4>
            <p>Add your first product to get started!</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <div 
                key={product.productId} 
                className="product-card clickable"
                onClick={() => navigate(`/products/${product.slug || toSlug(product.productName)}/modules`)}
              >
                <div className="product-header">
                  <h4 className="product-name">{product.productName}</h4>
                </div>
                <div className="product-meta">
                  <span className="product-date">
                    Created {formatDate(product.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;