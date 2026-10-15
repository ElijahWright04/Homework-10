import React, { useState } from 'react';
import PlantCard from './PlantCard';

export default function PlantList({ plants }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSunlight, setSelectedSunlight] = useState('All');

    // Filter plants based on search term and selected sunlight
    const filteredPlants = plants.filter(plant => {
        const matchesSearch = plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              plant.scientificName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSunlight = selectedSunlight === 'All' || plant.sunlight.includes(selectedSunlight);
        return matchesSearch && matchesSunlight;
    });

    return (
        <section style={{ padding: '2rem' }}>
            <h2 style={{ color: '#2d5a27', textAlign: 'center', marginBottom: '1.5rem' }}>Native Plant Directory</h2>
            
            {/* Search and Filter Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
                <input 
                    type="text" 
                    placeholder="Search by name or scientific name..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '0.6rem 1rem', width: '300px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
                />

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['All', 'Full Sun', 'Part Shade', 'Shade'].map(sun => (
                        <button 
                            key={sun}
                            onClick={() => setSelectedSunlight(sun)}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '4px',
                                border: '1px solid #2d5a27',
                                backgroundColor: selectedSunlight === sun ? '#2d5a27' : '#ffffff',
                                color: selectedSunlight === sun ? '#ffffff' : '#2d5a27',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {sun}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conditional Rendering for Empty States */}
            {filteredPlants.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', fontSize: '1.2rem' }}>No plants found matching your criteria.</p>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '1.5rem' 
                }}>
                    {filteredPlants.map(plant => (
                        <PlantCard key={plant.id} plant={plant} />
                    ))}
                </div>
            )}
        </section>
    );
}
