import React, { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProduct';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  
  // Extract productSlug from the URL path only when in product context
  const getProductSlugFromPath = () => {
    const match = location.pathname.match(/\/products\/([^\/]+)(?:\/|$)/);
    return match ? match[1] : null;
  };
  
  // Only fetch product data when we're viewing a specific product's modules or details
  const isInSpecificProductContext = location.pathname.match(/^\/products\/[^\/]+\/modules/);
  const productSlug = isInSpecificProductContext ? getProductSlugFromPath() : null;
  const { product } = useProduct(productSlug || undefined);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.hamburger-menu') && !target.closest('.hamburger-button')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">◈</span>
          <span className="brand-text">Mindful</span>
        </Link>
        
        {product && (
          <div className="navbar-product-name">
            <span className="product-name">{product.productName}</span>
          </div>
        )}
        
        <div className="navbar-menu">
          {user ? (
            <div className="hamburger-container">
              <button 
                className={`hamburger-button ${isMenuOpen ? 'active' : ''}`}
                onClick={toggleMenu}
                aria-label="Toggle menu"
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
              
              {isMenuOpen && (
                <div className="hamburger-menu">
                  <div className="menu-item menu-email">
                    <span className="menu-label">Signed in as:</span>
                    <span className="menu-value">{user.email}</span>
                  </div>
                  
                  {user.isSuperadmin && (
                    <Link 
                      to="/admin" 
                      className="menu-item menu-link"
                      onClick={closeMenu}
                    >
                      <span className="menu-icon material-icons">admin_panel_settings</span>
                      Admin Dashboard
                    </Link>
                  )}
                  
                  <button 
                    onClick={() => {
                      logout();
                      closeMenu();
                    }} 
                    className="menu-item menu-button"
                  >
                    <span className="menu-icon material-icons">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;