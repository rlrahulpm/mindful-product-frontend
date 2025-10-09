import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../../hooks/useProduct';
import { resourcePlanningService } from '../../services/resourcePlanningService';
import { getCurrentQuarter } from '../../utils/quarterUtils';
import {
  ResourcePlanningState,
  Team,
  TeamMember,
  BacklogEpic,
  UserStory,
  ResourceAssignment,
} from '../../types/resourcePlanning.types';
import TeamManagement from './components/SettingsSection/TeamManagement';
import PlanningCanvas from './components/PlanningCanvas/PlanningCanvas';
import ResourceOverview from './components/Summary/ResourceOverview';
import './ResourcePlanningPage.css';

const ResourcePlanningPage: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { product, loading: productLoading, error: productError } = useProduct(productSlug);

  const [state, setState] = useState<ResourcePlanningState>({
    teams: [],
    selectedTeam: null,
    publishedEpics: [],
    selectedEpic: null,
    userStories: [],
    selectedUserStory: null,
    assignments: [],
    availableMembers: [],
    allMembers: [],
    loading: false,
    error: null,
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'planning' | 'overview'>('settings');

  // Unlock body scroll on mount AND unmount (in case previous page left it locked)
  useEffect(() => {
    // Force unlock immediately on mount
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    // Also force unlock on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  useEffect(() => {
    if (product && productSlug) {
      loadInitialData();
    }
  }, [product, productSlug]);

  const loadInitialData = async () => {
    if (!productSlug || !product) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { year, quarter } = getCurrentQuarter();
      const [teams, epics, allMembers] = await Promise.all([
        resourcePlanningService.getTeams(product.productId, year, quarter),
        resourcePlanningService.getPublishedEpics(product.productId),
        resourcePlanningService.getAllMembers(product.productId),
      ]);

      setState(prev => ({
        ...prev,
        teams,
        publishedEpics: epics,
        allMembers,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load resource planning data',
        loading: false,
      }));
    }
  };

  const updateState = (updates: Partial<ResourcePlanningState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  if (productLoading || state.loading) {
    return (
      <div className="resource-planning-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading resource planning...</p>
        </div>
      </div>
    );
  }

  if (productError || state.error) {
    return (
      <div className="resource-planning-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{productError || state.error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            <span className="material-icons">arrow_back</span>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="resource-planning-container">
      {/* Header */}
      <div className="resource-planning-header">
        <div className="header-top-row">
          <div className="header-left">
            <button
              onClick={() => navigate(-1)}
              className="back-button"
              aria-label="Back"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <h1 className="page-title">
              <span className="material-icons">group</span>
              Resource Planning
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="material-icons">settings</span>
            Settings
          </button>
          <button
            className={`tab-button ${activeTab === 'planning' ? 'active' : ''}`}
            onClick={() => setActiveTab('planning')}
          >
            <span className="material-icons">assignment</span>
            Planning Canvas
          </button>
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="material-icons">visibility</span>
            Overview
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'settings' && (
          <TeamManagement
            productId={product!.productId}
            state={state}
            updateState={updateState}
            onRefresh={loadInitialData}
          />
        )}

        {activeTab === 'planning' && (
          <PlanningCanvas
            productId={product!.productId}
            state={state}
            updateState={updateState}
          />
        )}

        {activeTab === 'overview' && (
          <ResourceOverview
            productId={product!.productId}
            state={state}
            updateState={updateState}
          />
        )}
      </div>
    </div>
  );
};

export default ResourcePlanningPage;