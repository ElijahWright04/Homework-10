import React from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import PlantList from './components/PlantList';
import Footer from './components/Footer';
import { nativePlants } from './plantsData';

export default function App() {
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fbf8', minHeight: '100vh', margin: 0 }}>
            <Header />
            <Navigation />
            
            <main>
                <PlantList plants={nativePlants} />
            </main>
            
            <Footer />
        </div>
    );
}
