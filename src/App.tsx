import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import SuperadminRoute from './components/SuperadminRoute';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

// Lazy load the heavy components for better performance
const ProductModules = React.lazy(() => import('./components/ProductModules'));
const ProductBasics = React.lazy(() => import('./components/ProductBasics'));
const MarketCompetition = React.lazy(() => import('./components/MarketCompetition'));
const ProductHypothesis = React.lazy(() => import('./components/ProductHypothesis'));
const ProductBacklog = React.lazy(() => import('./components/ProductBacklog'));
const QuarterlyRoadmap = React.lazy(() => import('./components/QuarterlyRoadmap'));
const RoadmapVisualization = React.lazy(() => import('./components/RoadmapVisualization'));
const CapacityPlanning = React.lazy(() => import('./components/CapacityPlanning'));
const KanbanBoard = React.lazy(() => import('./components/KanbanBoard'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Suspense fallback={
            <div className="loading-container" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50vh',
              flexDirection: 'column'
            }}>
              <div className="spinner" style={{
                width: '40px',
                height: '40px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #0066cc',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ marginTop: '20px' }}>Loading...</p>
            </div>
          }>
            <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productSlug/modules" 
              element={
                <PrivateRoute>
                  <ProductModules />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productSlug/modules/basics" 
              element={
                <PrivateRoute>
                  <ProductBasics />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productSlug/modules/market-competition" 
              element={
                <PrivateRoute>
                  <MarketCompetition />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productSlug/modules/hypothesis" 
              element={
                <PrivateRoute>
                  <ProductHypothesis />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productSlug/modules/backlog" 
              element={
                <PrivateRoute>
                  <ProductBacklog />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productSlug/modules/roadmap" 
              element={
                <PrivateRoute>
                  <QuarterlyRoadmap />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productId/modules/kanban" 
              element={
                <PrivateRoute>
                  <KanbanBoard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productSlug/modules/roadmap-visualization" 
              element={
                <PrivateRoute>
                  <RoadmapVisualization />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:productSlug/modules/capacity-planning" 
              element={
                <PrivateRoute>
                  <CapacityPlanning />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <SuperadminRoute>
                  <AdminDashboard />
                </SuperadminRoute>
              } 
            />
          </Routes>
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
