import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/plants';
const LOGIN_URL = 'http://localhost:5000/api/login';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [plants, setPlants] = useState([]);
  const [formData, setFormData] = useState({ name: '', scientificName: '', sunlight: '', soil: '', heightInches: '', bloomSeason: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setPlants(data);
    } catch (err) {
      console.error('Error fetching plants:', err);
    }
  };

  // Handle Admin Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setToken(data.token);
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      setLoginError('Server connection error during login');
    }
  };

  // Handle Create / Edit (Protected)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/${editingId}` : API_URL;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setFormData({ name: '', scientificName: '', sunlight: '', soil: '', heightInches: '', bloomSeason: '' });
        setEditingId(null);
        fetchPlants();
      } else {
        alert('Action unauthorized or failed.');
      }
    } catch (err) {
      console.error('Error saving record:', err);
    }
  };

  const handleEdit = (plant) => {
    setEditingId(plant._id);
    setFormData({
      name: plant.name,
      scientificName: plant.scientificName,
      sunlight: plant.sunlight || '',
      soil: plant.soil || '',
      heightInches: plant.heightInches || '',
      bloomSeason: plant.bloomSeason || ''
    });
  };

  // Handle Delete (Protected)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this plant record?")) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPlants();
      } else {
        alert('Unauthorized deletion attempt.');
      }
    } catch (err) {
      console.error('Error deleting record:', err);
    }
  };

  // If NOT authenticated, show Admin Login Screen
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
        <h2>Admin Portal Login</h2>
        <p><small>Use username: <code>admin</code> and password: <code>securepassword123</code></small></p>
        {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="Username" 
            value={credentials.username} 
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} 
            required 
            style={{ padding: '8px' }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={credentials.password} 
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} 
            required 
            style={{ padding: '8px' }}
          />
          <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Log In
          </button>
        </form>
      </div>
    );
  }

  // If authenticated, show Administrative Dashboard
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#343a40', color: 'white', padding: '15px', borderRadius: '6px' }}>
        <h2>🔒 Plant App - Administrative Dashboard</h2>
        <button onClick={() => setIsAuthenticated(false)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          Log Out
        </button>
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginTop: '20px', border: '1px solid #ddd' }}>
        <h3>{editingId ? 'Edit Plant Record (Admin)' : 'Add New Plant Record (Admin)'}</h3>
        <input type="text" placeholder="Plant Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        <input type="text" placeholder="Scientific Name *" value={formData.scientificName} onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })} required />
        <input type="text" placeholder="Sunlight" value={formData.sunlight} onChange={(e) => setFormData({ ...formData, sunlight: e.target.value })} />
        <input type="text" placeholder="Soil Type" value={formData.soil} onChange={(e) => setFormData({ ...formData, soil: e.target.value })} />
        <input type="number" placeholder="Height in Inches" value={formData.heightInches} onChange={(e) => setFormData({ ...formData, heightInches: e.target.value })} />
        <input type="text" placeholder="Bloom Season" value={formData.bloomSeason} onChange={(e) => setFormData({ ...formData, bloomSeason: e.target.value })} />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ background: '#28a745', color: 'white', padding: '10px 15px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
            {editingId ? 'Update Plant' : 'Add Plant'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', scientificName: '', sunlight: '', soil: '', heightInches: '', bloomSeason: '' }); }} style={{ background: '#6c757d', color: 'white', padding: '10px 15px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* View Records List with Admin Actions */}
      <h3>Managed Plant Catalog ({plants.length})</h3>
      <div style={{ display: 'grid', gap: '15px' }}>
        {plants.map((plant) => (
          <div key={plant._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '6px', background: '#fff' }}>
            <h4>{plant.name} <small style={{ color: '#666' }}>({plant.scientificName})</small></h4>
            <p>Sunlight: {plant.sunlight} | Soil: {plant.soil} | Height: {plant.heightInches} in | Bloom: {plant.bloomSeason}</p>
            <button onClick={() => handleEdit(plant)} style={{ marginRight: '10px', padding: '6px 12px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
            <button onClick={() => handleDelete(plant._id)} style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
