import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProduct';
import './MarketCompetition.css';

interface MarketCompetitionData {
  id?: number;
  productId: number;
  marketSize: string;
  marketGrowth: string;
  targetMarket: string;
  competitors: string;
  competitiveAdvantage: string;
  marketTrends: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Competitor {
  id: string;
  name: string;
  strengths: string;
  weaknesses: string;
  marketShare: string;
}

interface Trend {
  id: string;
  description: string;
  impact: string;
}

const MarketCompetition: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);
  const [marketCompetition, setMarketCompetition] = useState<MarketCompetitionData>({
    productId: 0,
    marketSize: '',
    marketGrowth: '',
    targetMarket: '',
    competitors: '',
    competitiveAdvantage: '',
    marketTrends: ''
  });
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (product && product.productId) {
      loadMarketData();
      setMarketCompetition(prev => ({ ...prev, productId: product.productId }));
    }
  }, [product]);


  const loadMarketData = async () => {
    if (!product?.productId) return;
    
    try {
      setLoading(true);
      const marketData = await loadMarketCompetitionData(product.productId);
      if (marketData) {
        setMarketCompetition(marketData);
        
        // Parse competitors from the competitors string if it exists
        if (marketData.competitors) {
          try {
            const parsedCompetitors = JSON.parse(marketData.competitors);
            if (Array.isArray(parsedCompetitors)) {
              setCompetitors(parsedCompetitors);
            }
          } catch (e) {
            // If parsing fails, create a single competitor entry
            setCompetitors([{
              id: Date.now().toString(),
              name: 'Legacy Competitor',
              strengths: '',
              weaknesses: '',
              marketShare: marketData.competitors
            }]);
          }
        }
        
        // Parse trends from the marketTrends string if it exists
        if (marketData.marketTrends) {
          try {
            const parsedTrends = JSON.parse(marketData.marketTrends);
            if (Array.isArray(parsedTrends)) {
              setTrends(parsedTrends);
            }
          } catch (e) {
            // If parsing fails, treat as plain text and create a single trend
            setTrends([{
              id: Date.now().toString(),
              description: marketData.marketTrends,
              impact: ''
            }]);
          }
        }
      }
    } catch (err: any) {
      setError('Failed to load market competition data');
    } finally {
      setLoading(false);
    }
  };

  const loadMarketCompetitionData = async (productId: number): Promise<MarketCompetitionData | null> => {
    try {
      const response = await fetch(`http://localhost:8080/api/products/${productId}/market-competition`, {
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
        throw new Error('Failed to load market competition data');
      }
    } catch (error) {
      return null;
    }
  };

  const handleInputChange = (field: keyof MarketCompetitionData, value: string) => {
    setMarketCompetition(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const addCompetitor = () => {
    const newCompetitor: Competitor = {
      id: Date.now().toString(),
      name: '',
      strengths: '',
      weaknesses: '',
      marketShare: ''
    };
    setCompetitors(prev => [...prev, newCompetitor]);
  };

  const updateCompetitor = (id: string, field: keyof Competitor, value: string) => {
    setCompetitors(prev => prev.map(competitor => 
      competitor.id === id ? { ...competitor, [field]: value } : competitor
    ));
    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const deleteCompetitor = (id: string) => {
    setCompetitors(prev => prev.filter(competitor => competitor.id !== id));
  };

  const addTrend = () => {
    const newTrend: Trend = {
      id: Date.now().toString(),
      description: '',
      impact: ''
    };
    setTrends(prev => [...prev, newTrend]);
  };

  const updateTrend = (id: string, field: keyof Trend, value: string) => {
    setTrends(prev => prev.map(trend => 
      trend.id === id ? { ...trend, [field]: value } : trend
    ));
    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (error) setError('');
  };

  const deleteTrend = (id: string) => {
    setTrends(prev => prev.filter(trend => trend.id !== id));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch(`http://localhost:8080/api/products/${product?.productId}/market-competition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          marketSize: marketCompetition.marketSize,
          marketGrowth: marketCompetition.marketGrowth,
          targetMarket: marketCompetition.targetMarket,
          competitors: JSON.stringify(competitors.filter(c => c.name.trim())),
          competitiveAdvantage: marketCompetition.competitiveAdvantage,
          marketTrends: JSON.stringify(trends.filter(t => t.description.trim()))
        })
      });

      if (response.ok) {
        const savedData = await response.json();
        setMarketCompetition(savedData);
        setSuccessMessage('Market and competition analysis saved successfully!');
        setIsEditMode(false); // Switch back to view mode after saving
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to save market competition data');
      }
    } catch (err: any) {
      setError('Failed to save market competition data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || productLoading) {
    return (
      <div className="market-competition-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading market & competition analysis...</p>
        </div>
      </div>
    );
  }

  if ((error && !product) || productError) {
    return (
      <div className="market-competition-container">
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
    <div className="market-competition-container">
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
            <h1 className="page-title">Market & Competition Analysis</h1>
          </div>

          {!loading && !isEditMode && (
            <div className="header-actions">
              <button
                onClick={() => setIsEditMode(true)}
                className="edit-mode-btn"
                aria-label="Edit market analysis"
              >
                <span className="material-icons">edit</span>
                Edit
              </button>
            </div>
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
                <span className="material-icons">trending_up</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Market Size & Growth</h3>
                <p className="section-description">
                  Define the total addressable market (TAM) and growth projections. Include market segments and revenue potential.
                </p>
              </div>
            </div>
            <div className="input-wrapper">
              {isEditMode ? (
                <>
                  <div className="input-group">
                    <label className="input-label">Market Size</label>
                    <textarea
                      value={marketCompetition.marketSize}
                      onChange={(e) => handleInputChange('marketSize', e.target.value)}
                      placeholder="e.g., $50B global market, $10B in North America..."
                      className="form-textarea"
                      rows={3}
                      maxLength={5000}
                    />
                    <div className="character-count">
                      {marketCompetition.marketSize?.length || 0}/5000 characters
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Growth Rate & Projections</label>
                    <textarea
                      value={marketCompetition.marketGrowth}
                      onChange={(e) => handleInputChange('marketGrowth', e.target.value)}
                      placeholder="e.g., 15% CAGR, expected to reach $100B by 2030..."
                      className="form-textarea"
                      rows={3}
                      maxLength={5000}
                    />
                    <div className="character-count">
                      {marketCompetition.marketGrowth?.length || 0}/5000 characters
                    </div>
                  </div>
                </>
              ) : (
                <div className="view-mode-grid">
                  <div className="view-mode-item">
                    <h4 className="view-mode-label">Market Size</h4>
                    <div className="view-mode-content">
                      {marketCompetition.marketSize || <span className="empty-text">No market size data defined yet</span>}
                    </div>
                  </div>
                  <div className="view-mode-item">
                    <h4 className="view-mode-label">Growth Rate</h4>
                    <div className="view-mode-content">
                      {marketCompetition.marketGrowth || <span className="empty-text">No growth data defined yet</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">location_on</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Target Market</h3>
                <p className="section-description">
                  Identify your specific target market segments, geographic regions, and customer demographics.
                </p>
              </div>
            </div>
            <div className="input-wrapper">
              {isEditMode ? (
                <>
                  <textarea
                    value={marketCompetition.targetMarket}
                    onChange={(e) => handleInputChange('targetMarket', e.target.value)}
                    placeholder="Define your target market segments, regions, industries, customer types..."
                    className="form-textarea"
                    rows={4}
                    maxLength={5000}
                  />
                  <div className="character-count">
                    {marketCompetition.targetMarket?.length || 0}/5000 characters
                  </div>
                </>
              ) : (
                <div className="view-mode-content">
                  {marketCompetition.targetMarket || <span className="empty-text">No target market defined yet</span>}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">business</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Competitive Landscape</h3>
                <p className="section-description">
                  Analyze key competitors, their strengths, weaknesses, and market positioning.
                </p>
              </div>
            </div>
            <div className="competitors-container">
              {isEditMode ? (
                <>
                  {competitors.map((competitor) => (
                    <div key={competitor.id} className="competitor-item">
                      <div className="competitor-inputs">
                        <input
                          type="text"
                          value={competitor.name}
                          onChange={(e) => updateCompetitor(competitor.id, 'name', e.target.value)}
                          placeholder="Competitor name"
                          className="competitor-name-input"
                        />
                        <input
                          type="text"
                          value={competitor.marketShare}
                          onChange={(e) => updateCompetitor(competitor.id, 'marketShare', e.target.value)}
                          placeholder="Market share (e.g., 25%)"
                          className="competitor-share-input"
                        />
                        <input
                          type="text"
                          value={competitor.strengths}
                          onChange={(e) => updateCompetitor(competitor.id, 'strengths', e.target.value)}
                          placeholder="Key strengths"
                          className="competitor-strengths-input"
                        />
                        <input
                          type="text"
                          value={competitor.weaknesses}
                          onChange={(e) => updateCompetitor(competitor.id, 'weaknesses', e.target.value)}
                          placeholder="Key weaknesses"
                          className="competitor-weaknesses-input"
                        />
                      </div>
                      <div className="competitor-menu">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === competitor.id ? null : competitor.id)}
                          className="competitor-menu-btn"
                          aria-label="Competitor options"
                        >
                          <span className="material-icons">more_horiz</span>
                        </button>
                        {openMenuId === competitor.id && (
                          <div className="competitor-dropdown">
                            <button
                              type="button"
                              onClick={() => {
                                deleteCompetitor(competitor.id);
                                setOpenMenuId(null);
                              }}
                              className="competitor-dropdown-item delete"
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
                    onClick={addCompetitor}
                    className="add-competitor-btn"
                  >
                    <span className="material-icons">add</span>
                    Add Competitor
                  </button>
                </>
              ) : (
                <div className="view-mode-list">
                  {competitors.length > 0 ? (
                    competitors.map((competitor) => (
                      <div key={competitor.id} className="view-competitor-item">
                        <div className="view-competitor-header">
                          <span className="view-competitor-name">{competitor.name || 'Unnamed Competitor'}</span>
                          {competitor.marketShare && (
                            <span className="view-competitor-share">{competitor.marketShare}</span>
                          )}
                        </div>
                        <div className="view-competitor-details">
                          {competitor.strengths && (
                            <div className="view-competitor-strength">
                              <span className="detail-label">Strengths:</span> {competitor.strengths}
                            </div>
                          )}
                          {competitor.weaknesses && (
                            <div className="view-competitor-weakness">
                              <span className="detail-label">Weaknesses:</span> {competitor.weaknesses}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">No competitors analyzed yet</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">star</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Competitive Advantage</h3>
                <p className="section-description">
                  Define your unique value proposition and key differentiators that set you apart from competitors.
                </p>
              </div>
            </div>
            <div className="input-wrapper">
              {isEditMode ? (
                <>
                  <textarea
                    value={marketCompetition.competitiveAdvantage}
                    onChange={(e) => handleInputChange('competitiveAdvantage', e.target.value)}
                    placeholder="Describe your unique strengths, differentiators, and competitive moat..."
                    className="form-textarea"
                    rows={4}
                    maxLength={5000}
                  />
                  <div className="character-count">
                    {marketCompetition.competitiveAdvantage?.length || 0}/5000 characters
                  </div>
                </>
              ) : (
                <div className="view-mode-content">
                  {marketCompetition.competitiveAdvantage || <span className="empty-text">No competitive advantages defined yet</span>}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <span className="material-icons">insights</span>
              </div>
              <div className="section-info">
                <h3 className="section-title">Market Trends</h3>
                <p className="section-description">
                  Identify key market trends, emerging technologies, and shifts that could impact your product strategy.
                </p>
              </div>
            </div>
            <div className="trends-container">
              {isEditMode ? (
                <>
                  {trends.map((trend) => (
                    <div key={trend.id} className="trend-item">
                      <div className="trend-inputs">
                        <input
                          type="text"
                          value={trend.description}
                          onChange={(e) => updateTrend(trend.id, 'description', e.target.value)}
                          placeholder="Trend description (e.g., Shift to cloud-based solutions)"
                          className="trend-description-input"
                        />
                        <input
                          type="text"
                          value={trend.impact}
                          onChange={(e) => updateTrend(trend.id, 'impact', e.target.value)}
                          placeholder="Impact on your product/market (e.g., Opportunity to capture SMB segment)"
                          className="trend-impact-input"
                        />
                      </div>
                      <div className="trend-menu">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === trend.id ? null : trend.id)}
                          className="trend-menu-btn"
                          aria-label="Trend options"
                        >
                          <span className="material-icons">more_horiz</span>
                        </button>
                        {openMenuId === trend.id && (
                          <div className="trend-dropdown">
                            <button
                              type="button"
                              onClick={() => {
                                deleteTrend(trend.id);
                                setOpenMenuId(null);
                              }}
                              className="trend-dropdown-item delete"
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
                    onClick={addTrend}
                    className="add-trend-btn"
                  >
                    <span className="material-icons">add</span>
                    Add Market Trend
                  </button>
                </>
              ) : (
                <div className="view-mode-list">
                  {trends.length > 0 ? (
                    trends.map((trend, index) => (
                      <div key={trend.id} className="view-trend-item">
                        <div className="view-trend-header">
                          <span className="view-trend-number">{index + 1}.</span>
                          <span className="view-trend-description">{trend.description}</span>
                        </div>
                        {trend.impact && (
                          <div className="view-trend-impact">
                            <span className="impact-label">Impact:</span> {trend.impact}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="empty-text">No market trends identified yet</span>
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
              {saving ? 'Saving...' : 'Save Market Analysis'}
            </button>
          </div>
        )}
      </div>

      {marketCompetition.updatedAt && (
        <div className="last-updated">
          Last updated: {new Date(marketCompetition.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default MarketCompetition;