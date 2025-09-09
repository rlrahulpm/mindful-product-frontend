import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProduct';
import './ProductBasics.css';

interface ProductBasicsData {
  id?: number;
  productId: number;
  vision: string;
  targetPersonas: string;
  goals: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Persona {
  id: string;
  name: string;
  description: string;
}

interface Goal {
  id: string;
  description: string;
}

const ProductBasics: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);
  const [isEditMode, setIsEditMode] = useState(false);
  const [productBasics, setProductBasics] = useState<ProductBasicsData>({
    productId: 0,
    vision: '',
    targetPersonas: '',
    goals: ''
  });
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (product && product.productId) {
      loadBasicsData();
      setProductBasics(prev => ({ ...prev, productId: product.productId }));
    }
  }, [product]);

  const loadBasicsData = async () => {
    if (!product?.productId) return;
    
    try {
      setLoading(true);
      const basicsData = await loadProductBasics(product.productId);
      
      if (basicsData) {
        setProductBasics(basicsData);
        // Parse personas from the targetPersonas string if it exists
        if (basicsData.targetPersonas) {
          try {
            const parsedPersonas = JSON.parse(basicsData.targetPersonas);
            if (Array.isArray(parsedPersonas)) {
              setPersonas(parsedPersonas);
            }
          } catch (e) {
            // If parsing fails, treat as plain text and create a single persona
            setPersonas([{
              id: Date.now().toString(),
              name: 'Legacy Persona',
              description: basicsData.targetPersonas
            }]);
          }
        }
        
        // Parse goals from the goals string if it exists
        if (basicsData.goals) {
          try {
            const parsedGoals = JSON.parse(basicsData.goals);
            if (Array.isArray(parsedGoals)) {
              setGoals(parsedGoals);
            }
          } catch (e) {
            // If parsing fails, treat as plain text and create a single goal
            setGoals([{
              id: Date.now().toString(),
              description: basicsData.goals
            }]);
          }
        }
      }
    } catch (err: any) {
      setError('Failed to load product basics');
    } finally {
      setLoading(false);
    }
  };

  const loadProductBasics = async (productId: number): Promise<ProductBasicsData | null> => {
    try {
      const response = await fetch(`http://localhost:8080/api/products/${productId}/basics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        // No data exists yet, return null
        return null;
      } else {
        throw new Error('Failed to load product basics');
      }
    } catch (error) {
      return null;
    }
  };

  const handleInputChange = (field: keyof ProductBasicsData, value: string) => {
    setProductBasics(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const addPersona = () => {
    const newPersona: Persona = {
      id: Date.now().toString(),
      name: '',
      description: ''
    };
    setPersonas(prev => [...prev, newPersona]);
  };

  const updatePersona = (id: string, field: 'name' | 'description', value: string) => {
    setPersonas(prev => prev.map(persona => 
      persona.id === id ? { ...persona, [field]: value } : persona
    ));
    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const deletePersona = (id: string) => {
    setPersonas(prev => prev.filter(persona => persona.id !== id));
  };

  const addGoal = () => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      description: ''
    };
    setGoals(prev => [...prev, newGoal]);
  };

  const updateGoal = (id: string, description: string) => {
    setGoals(prev => prev.map(goal => 
      goal.id === id ? { ...goal, description } : goal
    ));
    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== id));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch(`http://localhost:8080/api/products/${product?.productId}/basics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          vision: productBasics.vision,
          targetPersonas: JSON.stringify(personas.filter(p => p.name.trim() || p.description.trim())),
          goals: JSON.stringify(goals.filter(g => g.description.trim()))
        })
      });

      if (response.ok) {
        const savedData = await response.json();
        setProductBasics(savedData);
        setSuccessMessage('Product basics saved successfully!');
        setIsEditMode(false); // Switch back to view mode after saving
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to save product basics');
      }
    } catch (err: any) {
      setError('Failed to save product basics. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || productLoading) {
    return (
      <div className="product-basics-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading product basics...</p>
        </div>
      </div>
    );
  }

  if ((error && !product) || productError) {
    return (
      <div className="product-basics-container">
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
    <div className="product-basics-container">
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
            <h1 className="page-title">Product Basics</h1>
          </div>

          {!loading && !isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="edit-mode-btn"
              aria-label="Edit product basics"
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
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">visibility</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Product Vision</h3>
                <p className="section-description">
                  Define the long-term vision and purpose of your product. What problem does it solve and what impact do you want to make?
                </p>
              </div>
            </div>
            <div className="input-wrapper">
              {isEditMode ? (
                <>
                  <textarea
                    value={productBasics.vision}
                    onChange={(e) => handleInputChange('vision', e.target.value)}
                    placeholder="Describe your product vision..."
                    className="form-textarea"
                    rows={4}
                    maxLength={5000}
                  />
                  <div className="character-count">
                    {productBasics.vision?.length || 0}/5000 characters
                  </div>
                </>
              ) : (
                <div className="view-mode-content">
                  {productBasics.vision || <span className="empty-text">No vision defined yet</span>}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">group</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Target Personas</h3>
                <p className="section-description">
                  Identify and describe your target audience. Who are your ideal customers and what are their key characteristics?
                </p>
              </div>
            </div>
            <div className="personas-container">
              {isEditMode ? (
                <>
                  {personas.map((persona) => (
                    <div key={persona.id} className="persona-item">
                      <div className="persona-inputs">
                        <input
                          type="text"
                          value={persona.name}
                          onChange={(e) => updatePersona(persona.id, 'name', e.target.value)}
                          placeholder="Persona name (e.g., Tech-savvy Professional)"
                          className="persona-name-input"
                        />
                        <input
                          type="text"
                          value={persona.description}
                          onChange={(e) => updatePersona(persona.id, 'description', e.target.value)}
                          placeholder="Description (e.g., 25-35 years old, works in tech, values efficiency)"
                          className="persona-description-input"
                        />
                      </div>
                      <div className="persona-menu">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === persona.id ? null : persona.id)}
                          className="persona-menu-btn"
                          aria-label="Persona options"
                        >
                          <span className="material-icons">more_horiz</span>
                        </button>
                        {openMenuId === persona.id && (
                          <div className="persona-dropdown">
                            <button
                              type="button"
                              onClick={() => {
                                deletePersona(persona.id);
                                setOpenMenuId(null);
                              }}
                              className="persona-dropdown-item delete"
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
                    onClick={addPersona}
                    className="add-persona-btn"
                  >
                    <span className="material-icons">add</span>
                    Add Persona
                  </button>
                </>
              ) : (
                <div className="view-mode-list">
                  {personas.length > 0 ? (
                    personas.map((persona) => (
                      <div key={persona.id} className="view-persona-item">
                        <span className="view-persona-name">{persona.name || 'Unnamed Persona'}</span>
                        <span className="view-persona-description">{persona.description}</span>
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">No personas defined yet</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">flag</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Product Goals</h3>
                <p className="section-description">
                  Set clear, measurable goals for your product. What specific outcomes do you want to achieve?
                </p>
              </div>
            </div>
            <div className="goals-container">
              {isEditMode ? (
                <>
                  {goals.map((goal) => (
                    <div key={goal.id} className="goal-item">
                      <div className="goal-inputs">
                        <input
                          type="text"
                          value={goal.description}
                          onChange={(e) => updateGoal(goal.id, e.target.value)}
                          placeholder="Goal description (e.g., Increase user engagement by 25% within 6 months)"
                          className="goal-description-input"
                        />
                      </div>
                      <div className="goal-menu">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === goal.id ? null : goal.id)}
                          className="goal-menu-btn"
                          aria-label="Goal options"
                        >
                          <span className="material-icons">more_horiz</span>
                        </button>
                        {openMenuId === goal.id && (
                          <div className="goal-dropdown">
                            <button
                              type="button"
                              onClick={() => {
                                deleteGoal(goal.id);
                                setOpenMenuId(null);
                              }}
                              className="goal-dropdown-item delete"
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
                    onClick={addGoal}
                    className="add-goal-btn"
                  >
                    <span className="material-icons">add</span>
                    Add Goal
                  </button>
                </>
              ) : (
                <div className="view-mode-list">
                  {goals.length > 0 ? (
                    goals.map((goal, index) => (
                      <div key={goal.id} className="view-goal-item">
                        <span className="view-goal-number">{index + 1}.</span>
                        <span className="view-goal-description">{goal.description}</span>
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">No goals defined yet</span>
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
              {saving ? 'Saving...' : 'Save Product Basics'}
            </button>
          </div>
        )}
      </div>

      {productBasics.updatedAt && (
        <div className="last-updated">
          Last updated: {new Date(productBasics.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default ProductBasics;