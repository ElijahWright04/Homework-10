import React, { useState, useEffect } from 'react';

const BASE_URL = 'http://localhost:5000';
const PLANTS_URL = `${BASE_URL}/plants`;

export default function AuthPlantManager() {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [token, setToken] = useState(() => localStorage.getItem('plantAuthToken') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('plantAuthUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [plants, setPlants] = useState([]);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [plantForm, setPlantForm] = useState({
    name: '',
    scientificName: '',
    sunlight: '',
    soil: '',
    heightInches: '',
    bloomSeason: ''
  });

  const fetchPlants = async () => {
    try {
      const res = await fetch(PLANTS_URL);
      const data = await res.json();
      if (res.ok) setPlants(data);
    } catch (err) {
      console.error('Error fetching plants:', err);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');

    const trimmedUsername = authForm.username.trim();
    if (trimmedUsername.length < 3) {
      setAuthError('Username must be at least 3 characters.');
      return;
    }
    if (authForm.password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password: authForm.password })
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }

      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('plantAuthToken', data.token);
      localStorage.setItem('plantAuthUser', JSON.stringify(data.user));
      setAuthForm({ username: '', password: '' });
      setAuthMessage(data.message);
    } catch (err) {
      setAuthError('Unable to reach authentication server.');
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setToken('');
      setCurrentUser(null);
      setEditingId(null);
      localStorage.removeItem('plantAuthToken');
      localStorage.removeItem('plantAuthUser');
      setAuthMessage('You have been logged out.');
    }
  };

  const handlePlantSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!token) {
      setFormError('You must be logged in to add or edit plant records.');
      return;
    }

    if (plantForm.name.trim().length < 2 || plantForm.scientificName.trim().length < 2) {
      setFormError('Both Name and Scientific Name must be at least 2 characters.');
      return;
    }

    if (plantForm.heightInches !== '' && Number(plantForm.heightInches) <= 0) {
      setFormError('Height must be a positive number.');
      return;
    }

    const url = editingId ? `${PLANTS_URL}/${editingId}` : PLANTS_URL;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(plantForm)
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to save plant.');
        return;
      }

      setPlantForm({ name: '', scientificName: '', sunlight: '', soil: '', heightInches: '', bloomSeason: '' });
      setEditingId(null);
      fetchPlants();
    } catch (err) {
      setFormError('Error saving plant record.');
    }
  };

  const handleEdit = (plant) => {
    if (!token) {
      setFormError('Please log in first to edit plant records.');
      return;
    }
    setEditingId(plant._id);
    setPlantForm({
      name: plant.name || '',
      scientificName: plant.scientificName || '',
      sunlight: plant.sunlight || '',
      soil: plant.soil || '',
      heightInches: plant.heightInches || '',
      bloomSeason: plant.bloomSeason || ''
    });
  };

  const handleDelete = async (id) => {
    setFormError('');
    if (!token) {
      setFormError('Please log in first to delete plant records.');
      return;
    }

    try {
      const res = await fetch(`${PLANTS_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to delete plant.');
        return;
      }
      fetchPlants();
    } catch (err) {
      setFormError('Error deleting plant record.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>Native Plant Account & Protected Manager</h2>

      {/* Auth Status / Login / Register Box */}
      <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '6px', background: '#f8f9fa', marginBottom: '24px' }}>
        {currentUser ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Logged in as:</strong> {currentUser.username} ({currentUser.role})
            </div>
            <button
              onClick={handleLogout}
              style={{ padding: '8px 14px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                style={{ padding: '6px 12px', background: authMode === 'login' ? '#007bff' : '#e2e6ea', color: authMode === 'login' ? '#fff' : '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                style={{ padding: '6px 12px', background: authMode === 'register' ? '#007bff' : '#e2e6ea', color: authMode === 'register' ? '#fff' : '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
              <input
                type="text"
                placeholder="Username (min 3 chars)"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                required
                style={{ padding: '8px' }}
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
                style={{ padding: '8px' }}
              />
              <button
                type="submit"
                style={{ padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {authMode === 'register' ? 'Create Account' : 'Log In'}
              </button>
            </form>
          </div>
        )}

        {authError && <p style={{ color: '#dc3545', marginTop: '10px' }}>{authError}</p>}
        {authMessage && <p style={{ color: '#28a745', marginTop: '10px' }}>{authMessage}</p>}
      </div>

      {/* Protected Create / Edit Plant Form */}
      <form onSubmit={handlePlantSubmit} style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '6px', marginBottom: '24px' }}>
        <h3>{editingId ? 'Edit Plant (Protected)' : 'Add Plant (Protected)'}</h3>
        {!token && (
          <p style={{ color: '#856404', background: '#fff3cd', padding: '8px', borderRadius: '4px' }}>
            Sign in above to unlock adding, editing, and deleting plants.
          </p>
        )}
        {formError && <p style={{ color: '#dc3545' }}>{formError}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input type="text" placeholder="Plant Name *" value={plantForm.name} onChange={(e) => setPlantForm({ ...plantForm, name: e.target.value })} required style={{ padding: '8px' }} />
          <input type="text" placeholder="Scientific Name *" value={plantForm.scientificName} onChange={(e) => setPlantForm({ ...plantForm, scientificName: e.target.value })} required style={{ padding: '8px' }} />
          <input type="text" placeholder="Sunlight" value={plantForm.sunlight} onChange={(e) => setPlantForm({ ...plantForm, sunlight: e.target.value })} style={{ padding: '8px' }} />
          <input type="text" placeholder="Soil" value={plantForm.soil} onChange={(e) => setPlantForm({ ...plantForm, soil: e.target.value })} style={{ padding: '8px' }} />
          <input type="number" placeholder="Height (Inches)" value={plantForm.heightInches} onChange={(e) => setPlantForm({ ...plantForm, heightInches: e.target.value })} style={{ padding: '8px' }} />
          <input type="text" placeholder="Bloom Season" value={plantForm.bloomSeason} onChange={(e) => setPlantForm({ ...plantForm, bloomSeason: e.target.value })} style={{ padding: '8px' }} />
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={!token}
            style={{ padding: '10px 16px', background: token ? '#28a745' : '#adb5bd', color: '#fff', border: 'none', borderRadius: '4px', cursor: token ? 'pointer' : 'not-allowed' }}
          >
            {editingId ? 'Update Plant' : 'Add Plant'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setPlantForm({ name: '', scientificName: '', sunlight: '', soil: '', heightInches: '', bloomSeason: '' }); }}
              style={{ padding: '10px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* View Plant List */}
      <h3>Plant Records ({plants.length})</h3>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {plants.map((plant) => (
          <li key={plant._id} style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '5px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{plant.name}</strong> <em>({plant.scientificName})</em><br />
              <small>Sunlight: {plant.sunlight || 'N/A'} | Soil: {plant.soil || 'N/A'} | Height: {plant.heightInches || 'N/A'} in | Bloom: {plant.bloomSeason || 'N/A'}</small>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleEdit(plant)}
                style={{ padding: '6px 12px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(plant._id)}
                style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
