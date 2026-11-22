import React, { useState } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import PlantList from './components/PlantList';
import PlantApiData from './components/PlantApiData';
import AdminDashboard from './components/AdminDashboard';
import AuthPlantManager from './components/AuthPlantManager';
import { nativePlants } from './plantsData';

export default function App() {
  const [currentView, setCurrentView] = useState('public'); // 'public', 'auth', or 'admin'

  return (
    <div>
      <Header />
      <Navigation />

      {/* View Switcher */}
      <div style={{ padding: '12px 20px', background: '#f1f3f5', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setCurrentView('public')}
          style={{ padding: '6px 12px', background: currentView === 'public' ? '#28a745' : '#e0e0e0', color: currentView === 'public' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Public Catalog
        </button>
        <button
          onClick={() => setCurrentView('auth')}
          style={{ padding: '6px 12px', background: currentView === 'auth' ? '#17a2b8' : '#e0e0e0', color: currentView === 'auth' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Account / Auth
        </button>
        <button
          onClick={() => setCurrentView('admin')}
          style={{ padding: '6px 12px', background: currentView === 'admin' ? '#007bff' : '#e0e0e0', color: currentView === 'admin' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          🔒 Admin Portal
        </button>
      </div>

      {/* Conditionally render based on selected view */}
      {currentView === 'public' && (
        <>
          <PlantApiData />
          <PlantList plants={nativePlants} />
        </>
      )}

      {currentView === 'auth' && (
        <AuthPlantManager />
      )}

      {currentView === 'admin' && (
        <AdminDashboard />
      )}
    </div>
  );
}
