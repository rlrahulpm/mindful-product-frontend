import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProduct';
import './ProductHypothesis.css';

interface ProductHypothesisData {
  id?: number;
  productId: number;
  hypothesisStatement: string;
  successMetrics: string;
  assumptions: string;
  initiatives: string;
  themes: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Initiative {
  id: string;
  title: string;
}

interface Theme {
  id: string;
  name: string;
  color: string;
}

interface Assumption {
  id: string;
  assumption: string;
  confidence: string;
  impact: string;
}


const ProductHypothesis: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);
  const [isEditMode, setIsEditMode] = useState(false);
  const [productHypothesis, setProductHypothesis] = useState<ProductHypothesisData>({
    productId: 0,
    hypothesisStatement: '',
    successMetrics: '',
    assumptions: '',
    initiatives: '',
    themes: ''
  });
  
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (product && product.productId) {
      loadHypothesisData();
      setProductHypothesis(prev => ({ ...prev, productId: product.productId }));
    }
  }, [product]);

  const loadHypothesisData = async () => {
    if (!product?.productId) return;
    
    try {
      setLoading(true);
      const hypothesisData = await loadProductHypothesisData(product.productId);
      
      if (hypothesisData) {
        setProductHypothesis(hypothesisData);
        
        // Parse initiatives
        if (hypothesisData.initiatives) {
          try {
            const parsedInitiatives = JSON.parse(hypothesisData.initiatives);
            if (Array.isArray(parsedInitiatives)) {
              setInitiatives(parsedInitiatives);
            }
          } catch (e) {
          }
        }
        
        // Parse themes
        if (hypothesisData.themes) {
          try {
            const parsedThemes = JSON.parse(hypothesisData.themes);
            if (Array.isArray(parsedThemes)) {
              setThemes(parsedThemes);
            }
          } catch (e) {
          }
        }
        
        // Parse assumptions
        if (hypothesisData.assumptions) {
          try {
            const parsedAssumptions = JSON.parse(hypothesisData.assumptions);
            if (Array.isArray(parsedAssumptions)) {
              setAssumptions(parsedAssumptions);
            }
          } catch (e) {
          }
        }
        
      }
    } catch (err: any) {
      setError('Failed to load product hypothesis data');
    } finally {
      setLoading(false);
    }
  };

  const loadProductHypothesisData = async (productId: number): Promise<ProductHypothesisData | null> => {
    try {
      const response = await fetch(`http://localhost:8080/api/products/${productId}/hypothesis`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        return null;
      } else {
        throw new Error('Failed to load product hypothesis data');
      }
    } catch (error) {
      return null;
    }
  };

  const handleInputChange = (field: keyof ProductHypothesisData, value: string) => {
    setProductHypothesis(prev => ({
      ...prev,
      [field]: value
    }));
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  // Initiative management
  const addInitiative = () => {
    const newInitiative: Initiative = {
      id: Date.now().toString(),
      title: ''
    };
    setInitiatives(prev => [...prev, newInitiative]);
  };

  const updateInitiative = (id: string, field: keyof Initiative, value: string) => {
    setInitiatives(prev => prev.map(initiative => 
      initiative.id === id ? { ...initiative, [field]: value } : initiative
    ));
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const deleteInitiative = (id: string) => {
    setInitiatives(prev => prev.filter(initiative => initiative.id !== id));
  };

  // Theme management
  const addTheme = () => {
    const newTheme: Theme = {
      id: Date.now().toString(),
      name: '',
      color: '#D97F5A'
    };
    setThemes(prev => [...prev, newTheme]);
  };

  const updateTheme = (id: string, field: keyof Theme, value: string) => {
    setThemes(prev => prev.map(theme => 
      theme.id === id ? { ...theme, [field]: value } : theme
    ));
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const deleteTheme = (id: string) => {
    setThemes(prev => prev.filter(theme => theme.id !== id));
  };

  // Assumption management
  const addAssumption = () => {
    const newAssumption: Assumption = {
      id: Date.now().toString(),
      assumption: '',
      confidence: 'Medium',
      impact: 'Medium'
    };
    setAssumptions(prev => [...prev, newAssumption]);
  };

  const updateAssumption = (id: string, field: keyof Assumption, value: string) => {
    setAssumptions(prev => prev.map(assumption => 
      assumption.id === id ? { ...assumption, [field]: value } : assumption
    ));
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const deleteAssumption = (id: string) => {
    setAssumptions(prev => prev.filter(assumption => assumption.id !== id));
  };


  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch(`http://localhost:8080/api/products/${product?.productId}/hypothesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          hypothesisStatement: productHypothesis.hypothesisStatement,
          successMetrics: productHypothesis.successMetrics,
          assumptions: JSON.stringify(assumptions.filter(a => a.assumption.trim())),
          initiatives: JSON.stringify(initiatives.filter(i => i.title.trim())),
          themes: JSON.stringify(themes.filter(t => t.name.trim()))
        })
      });

      if (response.ok) {
        const savedData = await response.json();
        setProductHypothesis(savedData);
        setSuccessMessage('Product hypothesis saved successfully!');
        setIsEditMode(false);
        
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to save product hypothesis data');
      }
    } catch (err: any) {
      setError('Failed to save product hypothesis data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || productLoading) {
    return (
      <div className="product-hypothesis-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading product hypothesis...</p>
        </div>
      </div>
    );
  }

  if ((error && !product) || productError) {
    return (
      <div className="product-hypothesis-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error || productError}</p>
          <button onClick={() => navigate(`/products/${productSlug}/modules`)} className="btn btn-primary">
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-hypothesis-container">
      <div className="page-header">
        <div className="header-top-row">
          <div className="header-left">
            <button 
              onClick={() => navigate(`/products/${productSlug}/modules`)} 
              className="back-button"
              aria-label="Back to modules"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <h1 className="page-title">Product Hypothesis</h1>
          </div>

          {!loading && !isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="edit-mode-btn"
              aria-label="Edit hypothesis"
            >
              <span className="material-icons">edit</span>
              Edit
            </button>
          )}

          {!loading && isEditMode && (
            <button
              onClick={() => setIsEditMode(false)}
              className="cancel-edit-btn"
              aria-label="Cancel editing"
            >
              <span className="material-icons">close</span>
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="content-layout">
        <div className="form-grid">
          {/* Hypothesis Statement */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">lightbulb</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Hypothesis Statement</h3>
                <p className="section-description">
                  A clear, testable statement about what you believe will happen and why.
                </p>
              </div>
            </div>
            <div className="input-wrapper">
              {isEditMode ? (
                <>
                  <textarea
                    value={productHypothesis.hypothesisStatement}
                    onChange={(e) => handleInputChange('hypothesisStatement', e.target.value)}
                    placeholder="We believe that [doing this] for [these people] will achieve [this outcome]. We will know we have succeeded when we see [this measure]."
                    className="form-textarea"
                    rows={4}
                    maxLength={5000}
                  />
                  <div className="character-count">
                    {productHypothesis.hypothesisStatement?.length || 0}/5000 characters
                  </div>
                </>
              ) : (
                <div className="view-mode-content">
                  {productHypothesis.hypothesisStatement || <span className="empty-text">No hypothesis statement defined yet</span>}
                </div>
              )}
            </div>
          </div>



          {/* Success Metrics */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">track_changes</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Success Metrics</h3>
                <p className="section-description">
                  Define measurable criteria that will indicate if your hypothesis is validated.
                </p>
              </div>
            </div>
            <div className="input-wrapper">
              {isEditMode ? (
                <>
                  <textarea
                    value={productHypothesis.successMetrics}
                    onChange={(e) => handleInputChange('successMetrics', e.target.value)}
                    placeholder="List specific, measurable metrics that will validate your hypothesis..."
                    className="form-textarea"
                    rows={4}
                    maxLength={5000}
                  />
                  <div className="character-count">
                    {productHypothesis.successMetrics?.length || 0}/5000 characters
                  </div>
                </>
              ) : (
                <div className="view-mode-content">
                  {productHypothesis.successMetrics || <span className="empty-text">No success metrics defined yet</span>}
                </div>
              )}
            </div>
          </div>

          {/* Assumptions */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">psychology</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Key Assumptions</h3>
                <p className="section-description">
                  Document assumptions underlying your hypothesis and assess their confidence and impact.
                </p>
              </div>
            </div>
            <div className="assumptions-container">
              {isEditMode ? (
                <>
                  {assumptions.map((assumption) => (
                    <div key={assumption.id} className="assumption-item">
                      <div className="assumption-inputs">
                        <input
                          type="text"
                          value={assumption.assumption}
                          onChange={(e) => updateAssumption(assumption.id, 'assumption', e.target.value)}
                          placeholder="Assumption statement"
                          className="assumption-text-input"
                        />
                        <select
                          value={assumption.confidence}
                          onChange={(e) => updateAssumption(assumption.id, 'confidence', e.target.value)}
                          className="assumption-confidence-input"
                        >
                          <option value="Low">Low Confidence</option>
                          <option value="Medium">Medium Confidence</option>
                          <option value="High">High Confidence</option>
                        </select>
                        <select
                          value={assumption.impact}
                          onChange={(e) => updateAssumption(assumption.id, 'impact', e.target.value)}
                          className="assumption-impact-input"
                        >
                          <option value="Low">Low Impact</option>
                          <option value="Medium">Medium Impact</option>
                          <option value="High">High Impact</option>
                        </select>
                      </div>
                      <div className="assumption-menu">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === assumption.id ? null : assumption.id)}
                          className="assumption-menu-btn"
                        >
                          <span className="material-icons">more_horiz</span>
                        </button>
                        {openMenuId === assumption.id && (
                          <div className="assumption-dropdown">
                            <button
                              type="button"
                              onClick={() => {
                                deleteAssumption(assumption.id);
                                setOpenMenuId(null);
                              }}
                              className="assumption-dropdown-item delete"
                            >
                              <span className="material-icons">delete</span>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAssumption}
                    className="add-assumption-btn"
                  >
                    <span className="material-icons">add</span>
                    Add Assumption
                  </button>
                </>
              ) : (
                <div className="view-mode-list">
                  {assumptions.length > 0 ? (
                    assumptions.map((assumption, index) => (
                      <div key={assumption.id} className="view-assumption-item">
                        <div className="view-assumption-header">
                          <span className="view-assumption-number">{index + 1}.</span>
                          <span className="view-assumption-text">{assumption.assumption}</span>
                        </div>
                        <div className="view-assumption-meta">
                          <span className={`confidence-badge ${assumption.confidence.toLowerCase()}`}>
                            {assumption.confidence} Confidence
                          </span>
                          <span className={`impact-badge ${assumption.impact.toLowerCase()}`}>
                            {assumption.impact} Impact
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">No assumptions documented yet</span>
                  )}
                </div>
              )}
            </div>
          </div>


          {/* Initiatives */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">rocket_launch</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Strategic Initiatives</h3>
                <p className="section-description">
                  Define key initiatives that will help validate or execute your hypothesis.
                </p>
              </div>
            </div>
            <div className="initiatives-container">
              {isEditMode ? (
                <>
                  {initiatives.map((initiative) => (
                    <div key={initiative.id} className="initiative-item">
                      <div className="initiative-inputs">
                        <input
                          type="text"
                          value={initiative.title}
                          onChange={(e) => updateInitiative(initiative.id, 'title', e.target.value)}
                          placeholder="Initiative title"
                          className="initiative-title-input"
                        />
                      </div>
                      <div className="initiative-menu">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === initiative.id ? null : initiative.id)}
                          className="initiative-menu-btn"
                        >
                          <span className="material-icons">more_horiz</span>
                        </button>
                        {openMenuId === initiative.id && (
                          <div className="initiative-dropdown">
                            <button
                              type="button"
                              onClick={() => {
                                deleteInitiative(initiative.id);
                                setOpenMenuId(null);
                              }}
                              className="initiative-dropdown-item delete"
                            >
                              <span className="material-icons">delete</span>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addInitiative}
                    className="add-initiative-btn"
                  >
                    <span className="material-icons">add</span>
                    Add Initiative
                  </button>
                </>
              ) : (
                <div className="view-mode-list">
                  {initiatives.length > 0 ? (
                    initiatives.map((initiative) => (
                      <div key={initiative.id} className="view-initiative-item">
                        <div className="view-initiative-header">
                          <span className="view-initiative-title">{initiative.title}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">No initiatives defined yet</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Themes */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">palette</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Strategic Themes</h3>
                <p className="section-description">
                  Define high-level themes that guide your product development and strategic decisions.
                </p>
              </div>
            </div>
            <div className="themes-container">
              {isEditMode ? (
                <>
                  {themes.map((theme) => (
                    <div key={theme.id} className="theme-item">
                      <div className="theme-inputs">
                        <input
                          type="text"
                          value={theme.name}
                          onChange={(e) => updateTheme(theme.id, 'name', e.target.value)}
                          placeholder="Theme name"
                          className="theme-name-input"
                        />
                        <input
                          type="color"
                          value={theme.color}
                          onChange={(e) => updateTheme(theme.id, 'color', e.target.value)}
                          className="theme-color-input"
                        />
                      </div>
                      <div className="theme-menu">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === theme.id ? null : theme.id)}
                          className="theme-menu-btn"
                        >
                          <span className="material-icons">more_horiz</span>
                        </button>
                        {openMenuId === theme.id && (
                          <div className="theme-dropdown">
                            <button
                              type="button"
                              onClick={() => {
                                deleteTheme(theme.id);
                                setOpenMenuId(null);
                              }}
                              className="theme-dropdown-item delete"
                            >
                              <span className="material-icons">delete</span>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTheme}
                    className="add-theme-btn"
                  >
                    <span className="material-icons">add</span>
                    Add Theme
                  </button>
                </>
              ) : (
                <div className="view-mode-list">
                  {themes.length > 0 ? (
                    themes.map((theme) => (
                      <div key={theme.id} className="view-theme-item">
                        <div className="view-theme-header">
                          <div
                            className="theme-color-indicator"
                            style={{ backgroundColor: theme.color }}
                          ></div>
                          <span className="view-theme-name">{theme.name}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">No themes defined yet</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isEditMode && (
          <div className="form-actions">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary save-btn"
            >
              <span className="material-icons">save</span>
              {saving ? 'Saving...' : 'Save Product Hypothesis'}
            </button>
          </div>
        )}
      </div>

      {productHypothesis.updatedAt && (
        <div className="last-updated">
          Last updated: {new Date(productHypothesis.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default ProductHypothesis;